import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface StaffVerificationItem {
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

export interface StaffDocumentRequest {
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

export const STAFF_CHECKLIST_SECTIONS = [
  { key: "identity", label: "Identity Verification", icon: "🪪" },
  { key: "qualification", label: "Qualification Authentication", icon: "🎓" },
  { key: "compliance", label: "Compliance Checks", icon: "🛡️" },
  { key: "eligibility", label: "Eligibility Confirmation", icon: "✅" },
  { key: "document", label: "Document Submission Review", icon: "📄" },
] as const;

export const CHECK_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-warning/10 text-warning border-warning/20" },
  passed: { label: "Passed", color: "bg-success/10 text-success border-success/20" },
  failed: { label: "Failed", color: "bg-destructive/10 text-destructive border-destructive/20" },
  flagged: { label: "Flagged", color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  not_applicable: { label: "N/A", color: "bg-muted text-muted-foreground border-border" },
};

export function useStaffVerificationChecklist(registrationId?: string) {
  return useQuery({
    queryKey: ["staff_verification_items", registrationId],
    enabled: !!registrationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_verification_items")
        .select("*")
        .eq("registration_id", registrationId!)
        .order("section")
        .order("check_name");
      if (error) throw error;
      return data as StaffVerificationItem[];
    },
  });
}

export function useUpdateStaffVerificationItem() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      itemId,
      registrationId,
      status,
      notes,
    }: {
      itemId: string;
      registrationId: string;
      status: "passed" | "failed" | "flagged" | "not_applicable";
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("staff_verification_items")
        .update({
          status,
          notes: notes || null,
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
      qc.invalidateQueries({ queryKey: ["staff_verification_items", vars.registrationId] });
      qc.invalidateQueries({ queryKey: ["onboarding_audit_log"] });
    },
  });
}

export function useBatchUpdateStaffChecklist() {
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
        .from("staff_verification_items")
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
      qc.invalidateQueries({ queryKey: ["staff_verification_items", vars.registrationId] });
      qc.invalidateQueries({ queryKey: ["onboarding_audit_log"] });
    },
  });
}

export function useStaffChecklistSummary(registrationId?: string) {
  const { data: items, isLoading } = useStaffVerificationChecklist(registrationId);

  if (isLoading || !items) {
    return { isLoading: true, sections: [], allPassed: false, totalChecks: 0, passedChecks: 0, progress: 0 };
  }

  const sections = STAFF_CHECKLIST_SECTIONS.map(s => {
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

// Staff Document Requests
export function useStaffDocumentRequests(registrationId?: string) {
  return useQuery({
    queryKey: ["staff_document_requests", registrationId],
    enabled: !!registrationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_document_requests")
        .select("*")
        .eq("registration_id", registrationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as StaffDocumentRequest[];
    },
  });
}

export function useCreateStaffDocumentRequest() {
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
        .from("staff_document_requests")
        .insert({
          registration_id: registrationId,
          requested_by: user?.id || null,
          document_types: documentTypes,
          message: message || null,
        })
        .select()
        .single();
      if (error) throw error;

      // Audit log
      await supabase.from("onboarding_audit_log").insert({
        entity_type: "staff",
        entity_id: registrationId,
        action: "document_request_sent",
        performed_by: user?.id || null,
        details: { document_types: documentTypes },
      });

      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["staff_document_requests", vars.registrationId] });
      qc.invalidateQueries({ queryKey: ["onboarding_audit_log"] });
    },
  });
}
