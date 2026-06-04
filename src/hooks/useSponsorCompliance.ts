import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useComplianceFrameworks(countryId?: string) {
  return useQuery({
    queryKey: ["sponsor_compliance_frameworks", countryId],
    queryFn: async () => {
      let q = supabase
        .from("sponsor_compliance_frameworks" as any)
        .select("*, countries(name, iso_code)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (countryId) q = q.eq("country_id", countryId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useComplianceIndicators(frameworkId?: string) {
  return useQuery({
    queryKey: ["sponsor_compliance_indicators", frameworkId],
    enabled: !!frameworkId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sponsor_compliance_indicators" as any)
        .select("*")
        .eq("framework_id", frameworkId!)
        .eq("is_active", true)
        .order("sequence_order");
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useComplianceRecords(frameworkId?: string, sponsorId?: string) {
  return useQuery({
    queryKey: ["sponsor_compliance_records", frameworkId, sponsorId],
    enabled: !!frameworkId,
    queryFn: async () => {
      let q = supabase
        .from("sponsor_compliance_records" as any)
        .select("*, sponsor_compliance_indicators(indicator_code, indicator_name, category, unit, max_points)")
        .eq("framework_id", frameworkId!);
      if (sponsorId) q = q.eq("sponsor_id", sponsorId);
      q = q.order("reporting_period_start", { ascending: false });
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useUpsertComplianceRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: any) => {
      const { data, error } = await supabase
        .from("sponsor_compliance_records" as any)
        .upsert(input, { onConflict: "indicator_id,sponsor_id,reporting_period_start" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sponsor_compliance_records"] }),
  });
}

export function useComplianceEvidence(recordId?: string) {
  return useQuery({
    queryKey: ["sponsor_compliance_evidence", recordId],
    enabled: !!recordId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sponsor_compliance_evidence" as any)
        .select("*")
        .eq("record_id", recordId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useCreateEvidence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: any) => {
      const { data, error } = await supabase
        .from("sponsor_compliance_evidence" as any)
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sponsor_compliance_evidence"] }),
  });
}

export function useComplianceReports(frameworkId?: string, sponsorId?: string) {
  return useQuery({
    queryKey: ["sponsor_compliance_reports", frameworkId, sponsorId],
    enabled: !!frameworkId,
    queryFn: async () => {
      let q = supabase
        .from("sponsor_compliance_reports" as any)
        .select("*")
        .eq("framework_id", frameworkId!);
      if (sponsorId) q = q.eq("sponsor_id", sponsorId);
      q = q.order("generated_at", { ascending: false });
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
}

/**
 * Calculate score: min((actual / target) * maxPoints, maxPoints)
 */
export function calculateScore(actual: number, target: number, maxPoints: number): number {
  if (target <= 0) return 0;
  return Math.min(Math.round(((actual / target) * maxPoints) * 100) / 100, maxPoints);
}
