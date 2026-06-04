import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AssessorPerformanceEntry {
  assessor_id: string;
  assessor_name: string;
  items_reviewed: number;
  approved: number;
  rejected: number;
  rejection_rate: number;
  common_rejection_categories: string[];
  consistency_score: number;
}

export interface ModeratorReportRow {
  id: string;
  moderator_id: string;
  report_mode: string;
  programme_id: string;
  cohort_id: string | null;
  status: string;
  total_items_reviewed: number;
  approved_count: number;
  rejected_count: number;
  avg_turnaround_hours: number;
  sampling_target_pct: number;
  sampling_achieved_pct: number;
  summary_notes: string | null;
  assessor_performance: AssessorPerformanceEntry[];
  systemic_issues: string | null;
  patterns_observed: string | null;
  recommendations: string | null;
  improvement_actions: string | null;
  declaration_text: string | null;
  moderator_signature_date: string | null;
  qa_manager_signature_date: string | null;
  report_date: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
  updated_at: string;
}

export function useModeratorReports() {
  return useQuery({
    queryKey: ["moderator_reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("moderator_reports")
        .select("*, programmes(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useModeratorReport(id: string | undefined) {
  return useQuery({
    queryKey: ["moderator_reports", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("moderator_reports")
        .select("*, programmes(title)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as any;
    },
  });
}

export function useCreateModeratorReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, any>) => {
      const { data, error } = await supabase
        .from("moderator_reports")
        .insert(input as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["moderator_reports"] }),
  });
}

export function useUpdateModeratorReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, any>) => {
      const { data, error } = await supabase
        .from("moderator_reports")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["moderator_reports"] }),
  });
}

export function useDeleteModeratorReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("moderator_reports")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["moderator_reports"] }),
  });
}

/** Auto-populate Section 1 & 2 from moderation_items data */
export async function calculateReportMetrics(programmeId: string, cohortId?: string) {
  // Get moderation items for this programme
  let q = supabase
    .from("moderation_items")
    .select("*")
    .eq("programme_id", programmeId);
  
  const { data: items = [] } = await q;
  const all = items as any[];

  const approved = all.filter(i => i.status === "approved");
  const rejected = all.filter(i => i.status === "rejected");

  // Calculate turnaround times
  const turnarounds = all
    .filter(i => i.reviewed_at && i.flagged_at)
    .map(i => {
      const diff = new Date(i.reviewed_at).getTime() - new Date(i.flagged_at).getTime();
      return diff / (1000 * 60 * 60); // hours
    });
  const avgTurnaround = turnarounds.length > 0
    ? turnarounds.reduce((a, b) => a + b, 0) / turnarounds.length
    : 0;

  // Get total submissions to calculate sampling achieved
  const { count: totalSubmissions } = await supabase
    .from("assessment_submissions")
    .select("*", { count: "exact", head: true })
    .eq("assessment_id", programmeId); // We'll use programme-level count

  const samplingAchieved = totalSubmissions && totalSubmissions > 0
    ? (all.length / totalSubmissions) * 100
    : 0;

  // Assessor performance breakdown
  const assessorMap = new Map<string, { approved: number; rejected: number; categories: string[] }>();
  all.forEach((item: any) => {
    const assessorId = item.submitted_by;
    if (!assessorId) return;
    if (!assessorMap.has(assessorId)) {
      assessorMap.set(assessorId, { approved: 0, rejected: 0, categories: [] });
    }
    const entry = assessorMap.get(assessorId)!;
    if (item.status === "approved") entry.approved++;
    if (item.status === "rejected") {
      entry.rejected++;
      if (item.rejection_category) entry.categories.push(item.rejection_category);
    }
  });

  // Get assessor names from profiles
  const assessorIds = Array.from(assessorMap.keys());
  const { data: profiles = [] } = assessorIds.length > 0
    ? await supabase.from("profiles").select("user_id, full_name").in("user_id", assessorIds)
    : { data: [] };

  const assessorPerformance: AssessorPerformanceEntry[] = assessorIds.map(id => {
    const entry = assessorMap.get(id)!;
    const total = entry.approved + entry.rejected;
    const profile = (profiles as any[]).find(p => p.user_id === id);
    return {
      assessor_id: id,
      assessor_name: profile?.full_name || "Unknown",
      items_reviewed: total,
      approved: entry.approved,
      rejected: entry.rejected,
      rejection_rate: total > 0 ? Math.round((entry.rejected / total) * 100) : 0,
      common_rejection_categories: [...new Set(entry.categories)],
      consistency_score: total > 0 ? Math.round((entry.approved / total) * 100) : 100,
    };
  });

  return {
    total_items_reviewed: all.length,
    approved_count: approved.length,
    rejected_count: rejected.length,
    avg_turnaround_hours: Math.round(avgTurnaround * 10) / 10,
    sampling_achieved_pct: Math.round(samplingAchieved * 10) / 10,
    assessor_performance: assessorPerformance,
  };
}
