import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Inter-Rater Reliability Hook
 * 
 * Calculates assessor consistency metrics for the moderation system:
 * - Agreement Rate: percentage of submissions where assessors agree
 * - Cohen's Kappa (simplified): chance-adjusted agreement measure
 * - Assessor Deviation Score: how far each assessor's grading deviates from peers
 *
 * Addresses the "no systematic inter-rater reliability scoring" gap.
 */

interface AssessorMetrics {
  assessorId: string;
  assessorName: string | null;
  totalGraded: number;
  averageScore: number;
  standardDeviation: number;
  agreementRate: number;
  deviationFromMean: number;
  consistencyRating: "High" | "Medium" | "Low";
}

interface ReliabilityReport {
  programmeId: string;
  assessorMetrics: AssessorMetrics[];
  overallAgreementRate: number;
  cohensKappa: number;
  reliabilityRating: "Excellent" | "Good" | "Fair" | "Poor";
  totalSubmissionsAnalysed: number;
}

function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sqDiffs = values.map((v) => Math.pow(v - mean, 2));
  return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
}

/**
 * Simplified Cohen's Kappa calculation
 * Uses pass/fail categorisation against pass_mark to create a binary classification,
 * then calculates kappa across all assessor pairs.
 */
function calculateCohensKappa(
  submissions: Array<{
    assessor_id: string;
    score: number | null;
    pass_mark: number | null;
    assessment_id: string;
    learner_id: string;
  }>
): number {
  // Group submissions by assessment+learner (items graded by multiple assessors)
  const itemMap = new Map<string, Array<{ assessorId: string; passed: boolean }>>();

  for (const sub of submissions) {
    if (sub.score === null || sub.assessor_id === null) continue;
    const key = `${sub.assessment_id}:${sub.learner_id}`;
    const passed = sub.pass_mark !== null ? sub.score >= sub.pass_mark : sub.score >= 50;

    if (!itemMap.has(key)) itemMap.set(key, []);
    itemMap.get(key)!.push({ assessorId: sub.assessor_id, passed });
  }

  // Only consider items graded by 2+ assessors (moderation re-grades count)
  let agreements = 0;
  let total = 0;
  let bothPassCount = 0;
  let bothFailCount = 0;
  let r1PassR2Fail = 0;
  let r1FailR2Pass = 0;

  for (const [, ratings] of itemMap) {
    if (ratings.length < 2) continue;

    // Compare first and last rater (original vs moderation re-assessment)
    const r1 = ratings[0];
    const r2 = ratings[ratings.length - 1];

    total++;
    if (r1.passed === r2.passed) {
      agreements++;
      if (r1.passed) bothPassCount++;
      else bothFailCount++;
    } else {
      if (r1.passed) r1PassR2Fail++;
      else r1FailR2Pass++;
    }
  }

  if (total === 0) return 1; // No dual-rated items — perfect by default

  const po = agreements / total; // Observed agreement
  const pYes1 = (bothPassCount + r1PassR2Fail) / total;
  const pYes2 = (bothPassCount + r1FailR2Pass) / total;
  const pNo1 = (bothFailCount + r1FailR2Pass) / total;
  const pNo2 = (bothFailCount + r1PassR2Fail) / total;
  const pe = pYes1 * pYes2 + pNo1 * pNo2; // Expected agreement by chance

  if (pe >= 1) return 1;
  return (po - pe) / (1 - pe);
}

export function useInterRaterReliability(programmeId?: string) {
  return useQuery({
    queryKey: ["inter-rater-reliability", programmeId],
    enabled: !!programmeId,
    queryFn: async (): Promise<ReliabilityReport> => {
      // Fetch all graded submissions for the programme
      const { data: submissions, error } = await supabase
        .from("assessment_submissions")
        .select(`
          id, assessor_id, score, learner_id, assessment_id, status,
          assessments!inner ( programme_id, pass_mark, title )
        `)
        .eq("assessments.programme_id", programmeId!)
        .in("status", ["assessed", "graded", "passed", "failed"]);

      if (error) throw error;

      const subs = (submissions ?? []) as any[];

      // Fetch assessor profiles
      const assessorIds = [...new Set(subs.map((s) => s.assessor_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", assessorIds);

      const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p.full_name]));

      // Calculate per-assessor metrics
      const assessorGroups = new Map<string, Array<{ score: number; passMark: number | null }>>();
      for (const sub of subs) {
        if (!sub.assessor_id || sub.score === null) continue;
        if (!assessorGroups.has(sub.assessor_id)) assessorGroups.set(sub.assessor_id, []);
        assessorGroups.get(sub.assessor_id)!.push({
          score: sub.score,
          passMark: sub.assessments?.pass_mark ?? null,
        });
      }

      // Global mean score
      const allScores = subs.filter((s) => s.score !== null).map((s) => s.score as number);
      const globalMean = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;

      const assessorMetrics: AssessorMetrics[] = [];
      for (const [assessorId, grades] of assessorGroups) {
        const scores = grades.map((g) => g.score);
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const stdDev = calculateStdDev(scores);
        const deviation = Math.abs(avg - globalMean);

        // Agreement: % of grades within 10% of global mean
        const withinThreshold = scores.filter((s) => Math.abs(s - globalMean) <= globalMean * 0.1).length;
        const agreementRate = scores.length > 0 ? (withinThreshold / scores.length) * 100 : 100;

        assessorMetrics.push({
          assessorId,
          assessorName: profileMap.get(assessorId) ?? null,
          totalGraded: grades.length,
          averageScore: Math.round(avg * 100) / 100,
          standardDeviation: Math.round(stdDev * 100) / 100,
          agreementRate: Math.round(agreementRate * 10) / 10,
          deviationFromMean: Math.round(deviation * 100) / 100,
          consistencyRating: agreementRate >= 80 ? "High" : agreementRate >= 60 ? "Medium" : "Low",
        });
      }

      // Calculate Cohen's Kappa
      const kappaInput = subs
        .filter((s) => s.assessor_id && s.score !== null)
        .map((s) => ({
          assessor_id: s.assessor_id,
          score: s.score as number,
          pass_mark: s.assessments?.pass_mark ?? null,
          assessment_id: s.assessment_id,
          learner_id: s.learner_id,
        }));

      const kappa = calculateCohensKappa(kappaInput);

      // Overall agreement
      const overallAgreement =
        assessorMetrics.length > 0
          ? assessorMetrics.reduce((a, m) => a + m.agreementRate, 0) / assessorMetrics.length
          : 100;

      const reliabilityRating: ReliabilityReport["reliabilityRating"] =
        kappa >= 0.8 ? "Excellent" : kappa >= 0.6 ? "Good" : kappa >= 0.4 ? "Fair" : "Poor";

      return {
        programmeId: programmeId!,
        assessorMetrics: assessorMetrics.sort((a, b) => b.totalGraded - a.totalGraded),
        overallAgreementRate: Math.round(overallAgreement * 10) / 10,
        cohensKappa: Math.round(kappa * 1000) / 1000,
        reliabilityRating,
        totalSubmissionsAnalysed: subs.length,
      };
    },
  });
}
