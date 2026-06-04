import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Guidance Conflict Detection Hook
 *
 * Detects potential conflicts between mentor feedback/goals and
 * assessor grading criteria for a given learner. Flags discrepancies
 * such as:
 *   - Mentor marks a goal as "achieved" but assessor fails the related assessment
 *   - Mentor provides positive workplace evidence but assessor scores below pass mark
 *   - Mentor goal timelines conflict with assessment due dates
 *
 * Addresses the "no conflict detection between mentor feedback and assessor criteria" gap.
 */

export interface GuidanceConflict {
  id: string;
  type: "outcome_mismatch" | "evidence_contradiction" | "timeline_conflict";
  severity: "high" | "medium" | "low";
  mentorDataSource: string;
  assessorDataSource: string;
  description: string;
  learnerId: string;
  learnerName: string | null;
  detectedAt: string;
}

export function useGuidanceConflictDetection(programmeId?: string) {
  return useQuery({
    queryKey: ["guidance-conflicts", programmeId],
    enabled: !!programmeId,
    queryFn: async (): Promise<GuidanceConflict[]> => {
      if (!programmeId) return [];

      const conflicts: GuidanceConflict[] = [];

      // 1. Fetch mentor goals for learners in this programme
      const { data: goals } = await (supabase as any)
        .from("mentor_goals")
        .select("id, mentee_id, title, status, target_date, progress")
        .eq("programme_id", programmeId);

      // 2. Fetch assessment submissions for the same programme
      const { data: submissions } = await supabase
        .from("assessment_submissions")
        .select(`
          id, learner_id, score, status, feedback, assessed_at,
          assessments!inner ( programme_id, pass_mark, title, due_date )
        `)
        .eq("assessments.programme_id", programmeId)
        .in("status", ["assessed", "graded", "passed", "failed"]);

      // 3. Fetch mentor evidence validations
      const { data: evidence } = await (supabase as any)
        .from("mentor_evidence")
        .select("id, mentee_id, status, title, validated_at")
        .eq("programme_id", programmeId);

      // 4. Fetch learner profiles for names
      const learnerIds = new Set<string>();
      (goals ?? []).forEach((g: any) => learnerIds.add(g.mentee_id));
      (submissions ?? []).forEach((s: any) => learnerIds.add(s.learner_id));

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", [...learnerIds]);

      const nameMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p.full_name]));

      // ─── Conflict Detection Logic ───

      // A. Outcome Mismatch: Mentor goal "completed" but assessor failed the learner
      const completedGoals = (goals ?? []).filter((g: any) => g.status === "completed" || g.progress >= 100);
      const failedSubmissions = (submissions ?? []).filter(
        (s: any) =>
          s.status === "failed" ||
          (s.score !== null && s.assessments?.pass_mark !== null && s.score < s.assessments.pass_mark)
      );

      for (const goal of completedGoals) {
        const learnerFails = failedSubmissions.filter((s: any) => s.learner_id === goal.mentee_id);
        for (const fail of learnerFails) {
          conflicts.push({
            id: `om-${goal.id}-${fail.id}`,
            type: "outcome_mismatch",
            severity: "high",
            mentorDataSource: `Goal: "${goal.title}" marked completed`,
            assessorDataSource: `Assessment: "${(fail as any).assessments?.title}" scored ${fail.score}/${(fail as any).assessments?.pass_mark} (Failed)`,
            description: `Mentor marked goal as completed but assessor failed the learner on a related assessment. This may indicate misaligned expectations or assessment criteria.`,
            learnerId: goal.mentee_id,
            learnerName: nameMap.get(goal.mentee_id) ?? null,
            detectedAt: new Date().toISOString(),
          });
        }
      }

      // B. Evidence Contradiction: Mentor approved workplace evidence but assessor gave low score
      const approvedEvidence = (evidence ?? []).filter((e: any) => e.status === "approved");
      for (const ev of approvedEvidence) {
        const learnerLowScores = (submissions ?? []).filter(
          (s: any) =>
            s.learner_id === ev.mentee_id &&
            s.score !== null &&
            s.assessments?.pass_mark !== null &&
            s.score < s.assessments.pass_mark * 0.7 // Significantly below pass mark
        );
        for (const low of learnerLowScores) {
          conflicts.push({
            id: `ec-${ev.id}-${low.id}`,
            type: "evidence_contradiction",
            severity: "medium",
            mentorDataSource: `Evidence: "${ev.title}" approved by mentor`,
            assessorDataSource: `Assessment: "${(low as any).assessments?.title}" scored ${low.score}/${(low as any).assessments?.pass_mark}`,
            description: `Mentor approved workplace evidence but assessor scored the learner significantly below the pass mark. Evidence quality or relevance may need review.`,
            learnerId: ev.mentee_id,
            learnerName: nameMap.get(ev.mentee_id) ?? null,
            detectedAt: new Date().toISOString(),
          });
        }
      }

      // C. Timeline Conflict: Mentor goal target date conflicts with assessment due date
      for (const goal of goals ?? []) {
        if (!goal.target_date) continue;
        const learnerSubs = (submissions ?? []).filter(
          (s: any) => s.learner_id === goal.mentee_id && s.assessments?.due_date
        );
        for (const sub of learnerSubs) {
          const goalDate = new Date(goal.target_date);
          const dueDate = new Date((sub as any).assessments.due_date);
          // Flag if goal target is more than 14 days after assessment due date
          const diffDays = (goalDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays > 14) {
            conflicts.push({
              id: `tc-${goal.id}-${sub.id}`,
              type: "timeline_conflict",
              severity: "low",
              mentorDataSource: `Goal: "${goal.title}" target date ${goal.target_date}`,
              assessorDataSource: `Assessment: "${(sub as any).assessments?.title}" due ${(sub as any).assessments.due_date}`,
              description: `Mentor goal target date is ${Math.round(diffDays)} days after the assessment due date. Learner may complete the goal too late to benefit from assessment preparation.`,
              learnerId: goal.mentee_id,
              learnerName: nameMap.get(goal.mentee_id) ?? null,
              detectedAt: new Date().toISOString(),
            });
          }
        }
      }

      return conflicts.sort((a, b) => {
        const sevOrder = { high: 0, medium: 1, low: 2 };
        return sevOrder[a.severity] - sevOrder[b.severity];
      });
    },
  });
}
