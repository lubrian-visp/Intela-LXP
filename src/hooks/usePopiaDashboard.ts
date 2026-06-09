/**
 * usePopiaDashboard — PoPIA compliance hooks
 * Connects the PoPIA Compliance page to live Supabase data.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const db = supabase as any;

// ── DSAR Requests ─────────────────────────────────────────────────────────────
export function useDsarRequests(statusFilter?: string) {
  return useQuery({
    queryKey: ["dsar_requests", statusFilter],
    queryFn: async () => {
      let q = db.from("dsar_requests")
        .select("*, assignee:assignee_id(full_name:profiles(full_name))")
        .order("submitted_at", { ascending: false });
      if (statusFilter && statusFilter !== "All") q = q.eq("status", statusFilter.toLowerCase().replace(" ", "_"));
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

export function useCreateDsarRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      requester_name: string;
      requester_email: string;
      requester_user_id?: string;
      request_type: string;
      description?: string;
      tenant_id?: string;
    }) => {
      const { data, error } = await db.from("dsar_requests").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dsar_requests"] });
      toast.success("DSAR submitted successfully. You will be contacted within 30 days.");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateDsarRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await db.from("dsar_requests").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dsar_requests"] });
      toast.success("DSAR updated");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ── Breach Incidents ──────────────────────────────────────────────────────────
export function useBreachIncidents() {
  return useQuery({
    queryKey: ["breach_incidents"],
    queryFn: async () => {
      const { data, error } = await db.from("breach_incidents")
        .select("*")
        .order("discovered_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

export function useCreateBreachIncident() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      reference_no: string;
      incident_type: string;
      description: string;
      affected_subjects?: number;
      severity?: string;
      occurred_at?: string;
      tenant_id?: string;
    }) => {
      const { data, error } = await db.from("breach_incidents")
        .insert({ ...input, reported_by: user?.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["breach_incidents"] });
      toast.success("Breach incident recorded");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ── Live data inventory (computed from real tables) ───────────────────────────
export function useDataInventoryCounts() {
  return useQuery({
    queryKey: ["popia_data_inventory"],
    queryFn: async () => {
      const [profiles, submissions, enrolments, credentials, auditLog] = await Promise.all([
        db.from("profiles").select("id", { count: "exact", head: true }),
        db.from("assessment_submissions").select("id", { count: "exact", head: true }),
        db.from("enrolments").select("id", { count: "exact", head: true }),
        db.from("issued_credentials").select("id", { count: "exact", head: true }),
        db.from("onboarding_audit_log").select("id", { count: "exact", head: true }),
      ]);
      return {
        learner_personal:  profiles.count ?? 0,
        assessment_records: submissions.count ?? 0,
        enrolment_records:  enrolments.count ?? 0,
        credentials:        credentials.count ?? 0,
        audit_entries:      auditLog.count ?? 0,
      };
    },
    staleTime: 120_000,
  });
}

// ── Compliance stats (computed from real DSAR + breach data) ─────────────────
export function usePopiaStats() {
  const dsars    = useDsarRequests();
  const breaches = useBreachIncidents();

  const openDsars    = (dsars.data ?? []).filter((d: any) => d.status === "open" || d.status === "in_progress").length;
  const overdueDsars = (dsars.data ?? []).filter((d: any) => d.status === "overdue").length;
  const resolvedBreaches = (breaches.data ?? []).filter((b: any) => b.status === "resolved" || b.status === "reported_to_regulator").length;
  const totalBreaches    = (breaches.data ?? []).length;

  // Days since last breach
  const sorted = [...(breaches.data ?? [])].sort((a: any, b: any) =>
    new Date(b.discovered_at).getTime() - new Date(a.discovered_at).getTime()
  );
  const daysSinceBreach = sorted.length > 0
    ? Math.floor((Date.now() - new Date(sorted[0].discovered_at).getTime()) / 86_400_000)
    : null;

  return {
    openDsars, overdueDsars, resolvedBreaches, totalBreaches, daysSinceBreach,
    isLoading: dsars.isLoading || breaches.isLoading,
  };
}
