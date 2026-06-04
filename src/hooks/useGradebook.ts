import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type GradeSource = "assessment" | "activity";

export interface UnifiedGrade {
  source: GradeSource;
  grade_id: string;
  learner_id: string;
  programme_id: string | null;
  activity_id: string;
  activity_title: string;
  activity_type: string;
  score: number | null;
  max_score: number | null;
  pass_mark: number | null;
  status: string;
  moderation_status: string;
  feedback: string | null;
  recorded_by: string | null;
  moderated_by: string | null;
  activity_date: string | null;
  graded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GradingScale {
  id: string;
  name: string;
  description: string | null;
  scale_type: string;
  is_default: boolean;
  is_active: boolean;
  bands?: GradingBand[];
}

export interface GradingBand {
  id: string;
  scale_id: string;
  label: string;
  short_code: string | null;
  min_score: number | null;
  max_score: number | null;
  is_pass: boolean;
  colour_token: string;
  sequence_order: number;
}

export function useGradingScales() {
  return useQuery({
    queryKey: ["grading-scales"],
    queryFn: async () => {
      const { data: scales, error } = await supabase
        .from("grading_scales")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      const { data: bands } = await supabase
        .from("grading_scale_bands")
        .select("*")
        .order("sequence_order");
      return (scales ?? []).map((s) => ({
        ...s,
        bands: (bands ?? []).filter((b) => b.scale_id === s.id),
      })) as GradingScale[];
    },
  });
}

export function useDefaultGradingScale() {
  const { data: scales = [] } = useGradingScales();
  return scales.find((s) => s.is_default) ?? scales[0];
}

export function useUnifiedGradebook(filters?: {
  learnerId?: string;
  programmeId?: string;
  cohortId?: string;
}) {
  return useQuery({
    queryKey: ["unified-gradebook", filters],
    queryFn: async () => {
      let q = supabase.from("unified_gradebook").select("*");
      if (filters?.learnerId) q = q.eq("learner_id", filters.learnerId);
      if (filters?.programmeId) q = q.eq("programme_id", filters.programmeId);
      const { data, error } = await q.order("activity_date", { ascending: false }).limit(1000);
      if (error) throw error;
      return (data ?? []) as UnifiedGrade[];
    },
  });
}

export function useActivityGrades(filters?: { learnerId?: string; programmeId?: string; cohortId?: string }) {
  return useQuery({
    queryKey: ["activity-grades", filters],
    queryFn: async () => {
      let q = supabase.from("activity_grades").select("*");
      if (filters?.learnerId) q = q.eq("learner_id", filters.learnerId);
      if (filters?.programmeId) q = q.eq("programme_id", filters.programmeId);
      if (filters?.cohortId) q = q.eq("cohort_id", filters.cohortId);
      const { data, error } = await q.order("activity_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRecordActivityGrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      learner_id: string;
      programme_id?: string | null;
      cohort_id?: string | null;
      enrolment_id?: string | null;
      activity_type: string;
      activity_title: string;
      activity_date?: string;
      score?: number | null;
      max_score?: number;
      weighting?: number;
      feedback?: string | null;
      evidence_url?: string | null;
      status?: "draft" | "recorded" | "published";
    }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("activity_grades")
        .insert({
          ...input,
          recorded_by: u.user.id,
          status: input.status ?? "recorded",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activity-grades"] });
      qc.invalidateQueries({ queryKey: ["unified-gradebook"] });
      toast({ title: "Grade recorded", description: "The activity grade was saved." });
    },
    onError: (e: any) =>
      toast({ title: "Failed to record grade", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateActivityGrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: any) => {
      const { data, error } = await supabase
        .from("activity_grades")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activity-grades"] });
      qc.invalidateQueries({ queryKey: ["unified-gradebook"] });
      toast({ title: "Grade updated" });
    },
    onError: (e: any) =>
      toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });
}

export function useModerateActivityGrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      moderation_status: "approved" | "rejected" | "flagged";
      moderation_notes?: string;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("activity_grades")
        .update({
          moderation_status: input.moderation_status,
          moderated_by: u.user.id,
          moderated_at: new Date().toISOString(),
          moderation_notes: input.moderation_notes ?? null,
        })
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activity-grades"] });
      qc.invalidateQueries({ queryKey: ["unified-gradebook"] });
      toast({ title: "Moderation recorded" });
    },
    onError: (e: any) =>
      toast({ title: "Moderation failed", description: e.message, variant: "destructive" }),
  });
}

export function useGradeAuditLog(gradeId?: string) {
  return useQuery({
    queryKey: ["grade-audit", gradeId],
    enabled: !!gradeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grade_audit_log")
        .select("*")
        .eq("grade_id", gradeId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// Utility: map a numeric score onto a band
export function bandForScore(scale: GradingScale | undefined, score: number | null | undefined) {
  if (!scale?.bands || score == null) return null;
  return scale.bands.find(
    (b) =>
      (b.min_score == null || score >= b.min_score) &&
      (b.max_score == null || score <= b.max_score),
  );
}

// Map colour_token to Tailwind classes (semantic tokens only)
export function bandColourClasses(token: string) {
  switch (token) {
    case "success":
      return { bg: "bg-success/10", text: "text-success", border: "border-success/30", solid: "bg-success" };
    case "warning":
      return { bg: "bg-warning/10", text: "text-warning", border: "border-warning/30", solid: "bg-warning" };
    case "destructive":
      return { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/30", solid: "bg-destructive" };
    case "info":
      return { bg: "bg-info/10", text: "text-info", border: "border-info/30", solid: "bg-info" };
    case "accent":
      return { bg: "bg-accent/10", text: "text-accent", border: "border-accent/30", solid: "bg-accent" };
    default:
      return { bg: "bg-muted", text: "text-muted-foreground", border: "border-border", solid: "bg-muted-foreground" };
  }
}
