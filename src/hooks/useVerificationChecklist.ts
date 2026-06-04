import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ChecklistItem {
  id: string;
  registration_id: string;
  section: string;
  check_name: string;
  check_label: string;
  status: string;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
  evidence_document_id: string | null;
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentRequest {
  id: string;
  registration_id: string;
  requested_by: string | null;
  document_types: string[];
  message: string | null;
  secure_upload_token: string;
  status: string;
  expires_at: string;
  fulfilled_at: string | null;
  reminder_count: number;
  last_reminder_at: string | null;
  created_at: string;
}

export const CHECKLIST_SECTIONS = [
  { key: "identity", label: "Identity Verification", icon: "👤" },
  { key: "eligibility", label: "Eligibility Assessment", icon: "✅" },
  { key: "document", label: "Document Verification", icon: "📄" },
  { key: "compliance", label: "Compliance & Regulatory", icon: "⚖️" },
] as const;

export const CHECK_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-warning/10 text-warning border-warning/20" },
  passed: { label: "Passed", color: "bg-success/10 text-success border-success/20" },
  failed: { label: "Failed", color: "bg-destructive/10 text-destructive border-destructive/20" },
  flagged: { label: "Flagged", color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  not_applicable: { label: "N/A", color: "bg-muted text-muted-foreground border-border" },
};

// ── Fetch checklist items for a registration ──
export function useVerificationChecklist(registrationId?: string) {
  return useQuery({
    queryKey: ["verification_checklist", registrationId],
    enabled: !!registrationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verification_checklist_items")
        .select("*")
        .eq("registration_id", registrationId!)
        .order("section")
        .order("check_name");
      if (error) throw error;
      return data as ChecklistItem[];
    },
  });
}

// ── Update a checklist item status ──
export function useUpdateChecklistItem() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      itemId,
      registrationId,
      status,
      notes,
      evidenceDocumentId,
    }: {
      itemId: string;
      registrationId: string;
      status: "passed" | "failed" | "flagged" | "not_applicable";
      notes?: string;
      evidenceDocumentId?: string;
    }) => {
      const { data, error } = await supabase
        .from("verification_checklist_items")
        .update({
          status,
          notes: notes || null,
          evidence_document_id: evidenceDocumentId || null,
          verified_by: user?.id || null,
          verified_at: new Date().toISOString(),
        })
        .eq("id", itemId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["verification_checklist", vars.registrationId] });
      qc.invalidateQueries({ queryKey: ["onboarding_audit_log"] });
    },
  });
}

// ── Batch update (pass/fail all in a section) ──
export function useBatchUpdateChecklist() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      registrationId,
      section,
      status,
    }: {
      registrationId: string;
      section: string;
      status: "passed" | "failed";
    }) => {
      const { error } = await supabase
        .from("verification_checklist_items")
        .update({
          status,
          verified_by: user?.id || null,
          verified_at: new Date().toISOString(),
        })
        .eq("registration_id", registrationId)
        .eq("section", section)
        .eq("status", "pending");
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["verification_checklist", vars.registrationId] });
      qc.invalidateQueries({ queryKey: ["onboarding_audit_log"] });
    },
  });
}

// ── Checklist summary helper ──
export function useChecklistSummary(registrationId?: string) {
  const { data: items, isLoading } = useVerificationChecklist(registrationId);

  if (isLoading || !items) {
    return { isLoading: true, sections: [], allPassed: false, totalChecks: 0, passedChecks: 0, progress: 0 };
  }

  const sections = CHECKLIST_SECTIONS.map(s => {
    const sectionItems = items.filter(i => i.section === s.key);
    const required = sectionItems.filter(i => i.is_required);
    const passed = required.filter(i => i.status === "passed" || i.status === "not_applicable");
    const failed = sectionItems.filter(i => i.status === "failed");
    const flagged = sectionItems.filter(i => i.status === "flagged");
    return {
      ...s,
      items: sectionItems,
      total: required.length,
      passed: passed.length,
      failed: failed.length,
      flagged: flagged.length,
      complete: required.length > 0 && passed.length === required.length,
    };
  });

  const totalChecks = items.filter(i => i.is_required).length;
  const passedChecks = items.filter(i => i.is_required && (i.status === "passed" || i.status === "not_applicable")).length;
  const allPassed = totalChecks > 0 && passedChecks === totalChecks;
  const progress = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

  return { isLoading: false, sections, allPassed, totalChecks, passedChecks, progress };
}

// ── Document Requests ──
export function useDocumentRequests(registrationId?: string) {
  return useQuery({
    queryKey: ["document_requests", registrationId],
    enabled: !!registrationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_requests")
        .select("*")
        .eq("registration_id", registrationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DocumentRequest[];
    },
  });
}

export function useCreateDocumentRequest() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      registrationId,
      documentTypes,
      message,
    }: {
      registrationId: string;
      documentTypes: string[];
      message?: string;
    }) => {
      const { data, error } = await supabase
        .from("document_requests")
        .insert({
          registration_id: registrationId,
          requested_by: user?.id || null,
          document_types: documentTypes,
          message: message || null,
        })
        .select()
        .single();
      if (error) throw error;

      // Update registration status to returned_for_revision
      await supabase
        .from("learner_registrations")
        .update({
          status: "returned_for_revision",
          rejection_reason: `Missing documents requested: ${documentTypes.join(", ")}`,
        })
        .eq("id", registrationId);

      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["document_requests", vars.registrationId] });
      qc.invalidateQueries({ queryKey: ["learner_registrations"] });
      qc.invalidateQueries({ queryKey: ["onboarding_audit_log"] });
    },
  });
}

// ── Validation Mode ──
export function useValidationMode() {
  return useQuery({
    queryKey: ["platform_settings", "document_validation_mode"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("*")
        .eq("setting_key", "document_validation_mode")
        .single();
      if (error) return "manual";
      return data?.setting_value || "manual";
    },
  });
}

// ── SLA Config ──
export function useSLAConfig() {
  return useQuery({
    queryKey: ["platform_settings", "sla_config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("*")
        .in("setting_key", ["sla_verification_hours", "sla_amber_threshold_percent", "risk_flag_threshold_days"]);
      if (error) return { hours: 48, amberPercent: 75, riskDays: 7 };
      const get = (key: string, def: number) => {
        const row = data?.find((r: any) => r.setting_key === key);
        return row ? parseInt(row.setting_value) : def;
      };
      return {
        hours: get("sla_verification_hours", 48),
        amberPercent: get("sla_amber_threshold_percent", 75),
        riskDays: get("risk_flag_threshold_days", 7),
      };
    },
  });
}

// ── SLA Status Calculator ──
export function getSLAStatus(
  registration: {
    sla_started_at?: string | null;
    sla_deadline_at?: string | null;
    sla_paused_at?: string | null;
    sla_breached?: boolean;
    status?: string;
  },
  amberPercent: number = 75
): { color: "green" | "amber" | "red" | "grey"; label: string; hoursRemaining: number | null } {
  if (!registration.sla_started_at || !registration.sla_deadline_at) {
    return { color: "grey", label: "No SLA", hoursRemaining: null };
  }

  if (["approved", "rejected", "enrolled"].includes(registration.status || "")) {
    return { color: "grey", label: "Completed", hoursRemaining: null };
  }

  if (registration.sla_breached) {
    return { color: "red", label: "SLA Breached", hoursRemaining: 0 };
  }

  if (registration.sla_paused_at) {
    return { color: "grey", label: "Paused", hoursRemaining: null };
  }

  const now = new Date();
  const deadline = new Date(registration.sla_deadline_at);
  const started = new Date(registration.sla_started_at);
  const totalMs = deadline.getTime() - started.getTime();
  const elapsedMs = now.getTime() - started.getTime();
  const remainingMs = deadline.getTime() - now.getTime();
  const hoursRemaining = Math.max(0, Math.round(remainingMs / (1000 * 60 * 60) * 10) / 10);

  if (remainingMs <= 0) {
    return { color: "red", label: "SLA Breached", hoursRemaining: 0 };
  }

  const percentElapsed = (elapsedMs / totalMs) * 100;
  if (percentElapsed >= amberPercent) {
    return { color: "amber", label: `${hoursRemaining}h left`, hoursRemaining };
  }

  return { color: "green", label: `${hoursRemaining}h left`, hoursRemaining };
}
