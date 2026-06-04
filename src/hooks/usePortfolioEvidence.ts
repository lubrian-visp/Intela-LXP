import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type PoeSource = "submission" | "evidence";

export interface PoeItem {
  id: string;
  source: PoeSource;
  learner_id: string;
  learner_name?: string;
  title: string;
  description?: string | null;
  status: string;
  submitted_at: string | null;
  reviewed_at?: string | null;
  reviewer_id?: string | null;
  score?: number | null;
  max_score?: number | null;
  pass_mark?: number | null;
  feedback?: string | null;
  file_url?: string | null;
  outcomes: string[];
  moderation_status?: string | null;
  moderation_notes?: string | null;
  evidence_type?: string | null;
  raw: any;
}

/**
 * Unified Portfolio of Evidence: merges assessment_submissions + workplace_evidence
 * into a single normalised feed. RLS handles scoping (learners see own, staff see all
 * within their cohorts, admins see all).
 */
export function usePortfolioEvidence(filters?: { learnerId?: string }) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["portfolio_evidence", filters?.learnerId ?? "all", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<PoeItem[]> => {
      // Assessment submissions
      let subQ = supabase
        .from("assessment_submissions")
        .select("*, assessments(title, max_score, pass_mark, learning_outcomes)")
        .order("submitted_at", { ascending: false, nullsFirst: false });
      if (filters?.learnerId) subQ = subQ.eq("learner_id", filters.learnerId);
      const { data: subs, error: subErr } = await subQ;
      if (subErr) throw subErr;

      // Workplace evidence
      let evQ = supabase
        .from("workplace_evidence")
        .select("*")
        .order("submitted_at", { ascending: false });
      if (filters?.learnerId) evQ = evQ.eq("learner_id", filters.learnerId);
      const { data: evs, error: evErr } = await evQ;
      if (evErr) throw evErr;

      const learnerIds = Array.from(
        new Set([...(subs ?? []).map((s: any) => s.learner_id), ...(evs ?? []).map((e: any) => e.learner_id)]),
      ).filter(Boolean);

      let names: Record<string, string> = {};
      if (learnerIds.length) {
        const { data: profs } = await supabase
          .from("profiles_safe")
          .select("id, full_name")
          .in("id", learnerIds);
        names = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.full_name ?? "Learner"]));
      }

      const normaliseOutcomes = (raw: any): string[] => {
        if (!raw) return [];
        if (Array.isArray(raw)) return raw.map((o) => (typeof o === "string" ? o : o?.title ?? o?.label ?? "")).filter(Boolean);
        if (typeof raw === "string") return [raw];
        return [];
      };

      const submissionItems: PoeItem[] = (subs ?? []).map((s: any) => ({
        id: s.id,
        source: "submission",
        learner_id: s.learner_id,
        learner_name: names[s.learner_id],
        title: s.assessments?.title ?? "Assessment Submission",
        description: null,
        status: s.status,
        submitted_at: s.submitted_at,
        reviewed_at: s.assessed_at,
        reviewer_id: s.assessor_id,
        score: s.score,
        max_score: s.assessments?.max_score,
        pass_mark: s.assessments?.pass_mark,
        feedback: s.feedback,
        outcomes: normaliseOutcomes(s.assessments?.learning_outcomes),
        moderation_status: s.moderation_status,
        moderation_notes: s.moderation_notes,
        raw: s,
      }));

      const evidenceItems: PoeItem[] = (evs ?? []).map((e: any) => ({
        id: e.id,
        source: "evidence",
        learner_id: e.learner_id,
        learner_name: names[e.learner_id],
        title: e.title,
        description: e.description,
        status: e.status,
        submitted_at: e.submitted_at,
        reviewed_at: e.reviewed_at,
        reviewer_id: e.reviewed_by,
        feedback: e.review_notes,
        file_url: e.file_url,
        evidence_type: e.evidence_type,
        outcomes: [],
        raw: e,
      }));

      return [...submissionItems, ...evidenceItems].sort((a, b) => {
        const ta = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
        const tb = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
        return tb - ta;
      });
    },
  });
}

/**
 * Single mutation that routes the review to the correct underlying table
 * based on item.source. decision: "approve" | "revise" | "reject".
 */
export function useReviewPoeItem() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      item: PoeItem;
      decision: "approve" | "revise" | "reject";
      notes?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const now = new Date().toISOString();

      if (input.item.source === "submission") {
        const statusMap: Record<typeof input.decision, string> = {
          approve: "competent",
          revise: "resubmit",
          reject: "not_yet_competent",
        };
        const { error } = await supabase
          .from("assessment_submissions")
          .update({
            status: statusMap[input.decision],
            feedback: input.notes ?? input.item.feedback ?? null,
            assessor_id: user.id,
            assessed_at: now,
          })
          .eq("id", input.item.id);
        if (error) throw error;
      } else {
        const statusMap: Record<typeof input.decision, string> = {
          approve: "approved",
          revise: "revision_requested",
          reject: "rejected",
        };
        const { error } = await supabase
          .from("workplace_evidence")
          .update({
            status: statusMap[input.decision],
            review_notes: input.notes ?? input.item.feedback ?? null,
            reviewed_by: user.id,
            reviewed_at: now,
          })
          .eq("id", input.item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portfolio_evidence"] });
      qc.invalidateQueries({ queryKey: ["assessment_submissions"] });
      qc.invalidateQueries({ queryKey: ["workplace_evidence"] });
      toast.success("Evidence reviewed");
    },
    onError: (e: any) => toast.error(e.message ?? "Review failed"),
  });
}

/** Bulk review — applies the same decision to many items in one go. */
export function useBulkReviewPoeItems() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      items: PoeItem[];
      decision: "approve" | "revise" | "reject";
      notes?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const now = new Date().toISOString();
      const subStatus = { approve: "competent", revise: "resubmit", reject: "not_yet_competent" } as const;
      const evStatus = { approve: "approved", revise: "revision_requested", reject: "rejected" } as const;

      const subIds = input.items.filter((i) => i.source === "submission").map((i) => i.id);
      const evIds = input.items.filter((i) => i.source === "evidence").map((i) => i.id);

      if (subIds.length) {
        const { error } = await supabase
          .from("assessment_submissions")
          .update({
            status: subStatus[input.decision],
            feedback: input.notes ?? null,
            assessor_id: user.id,
            assessed_at: now,
          })
          .in("id", subIds);
        if (error) throw error;
      }
      if (evIds.length) {
        const { error } = await supabase
          .from("workplace_evidence")
          .update({
            status: evStatus[input.decision],
            review_notes: input.notes ?? null,
            reviewed_by: user.id,
            reviewed_at: now,
          })
          .in("id", evIds);
        if (error) throw error;
      }
      return input.items.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["portfolio_evidence"] });
      qc.invalidateQueries({ queryKey: ["assessment_submissions"] });
      qc.invalidateQueries({ queryKey: ["workplace_evidence"] });
      toast.success(`${count} item${count === 1 ? "" : "s"} reviewed`);
    },
    onError: (e: any) => toast.error(e.message ?? "Bulk review failed"),
  });
}

/** Send an assessment submission to the moderation queue (4-eyes). */
export function useSendToModeration() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { item: PoeItem; reason: string; priority?: "low" | "medium" | "high" }) => {
      if (!user) throw new Error("Not authenticated");
      if (input.item.source !== "submission") {
        throw new Error("Only assessment submissions can be sent to moderation");
      }
      const raw = input.item.raw ?? {};
      const { error } = await supabase.from("moderation_items").insert({
        item_type: "assessment_submission",
        submitted_by: user.id,
        programme_id: raw.programme_id ?? null,
        submission_id: input.item.id,
        content: `${input.item.title} — ${input.item.learner_name ?? "Learner"}`,
        reason: input.reason,
        priority: input.priority ?? "medium",
        status: "pending",
      });
      if (error) throw error;

      await supabase
        .from("assessment_submissions")
        .update({ moderation_status: "pending" })
        .eq("id", input.item.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portfolio_evidence"] });
      qc.invalidateQueries({ queryKey: ["moderation_items"] });
      toast.success("Sent to moderation queue");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to send to moderation"),
  });
}
