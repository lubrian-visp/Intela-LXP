import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface LearnerDocument {
  id: string;
  registration_id: string;
  document_type: string;
  document_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  status: string;
  rejection_reason: string | null;
  verified_by: string | null;
  verified_at: string | null;
  uploaded_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const DOCUMENT_TYPES = [
  { value: "national_id", label: "National ID / Passport" },
  { value: "qualification", label: "Qualification Certificate" },
  { value: "proof_of_residence", label: "Proof of Residence" },
  { value: "medical", label: "Medical Certificate" },
  { value: "cv", label: "CV / Resume" },
  { value: "motivation_letter", label: "Motivation Letter" },
  { value: "other", label: "Other" },
] as const;

export const DOC_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending_review: { label: "Pending Review", color: "bg-warning/10 text-warning border-warning/20" },
  verified: { label: "Verified", color: "bg-success/10 text-success border-success/20" },
  rejected: { label: "Rejected", color: "bg-destructive/10 text-destructive border-destructive/20" },
  expired: { label: "Expired", color: "bg-muted text-muted-foreground border-border" },
};

export function useLearnerDocuments(registrationId?: string) {
  return useQuery({
    queryKey: ["learner_documents", registrationId],
    enabled: !!registrationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learner_documents")
        .select("*")
        .eq("registration_id", registrationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as LearnerDocument[];
    },
  });
}

export function useUploadLearnerDocument() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      registrationId,
      documentType,
      file,
    }: {
      registrationId: string;
      documentType: string;
      file: File;
    }) => {
      const ext = file.name.split(".").pop();
      const filePath = `${registrationId}/${documentType}_${Date.now()}.${ext}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("learner-documents")
        .upload(filePath, file, { upsert: false });
      if (uploadError) throw uploadError;

      // Insert record
      const { data, error } = await supabase
        .from("learner_documents")
        .insert({
          registration_id: registrationId,
          document_type: documentType,
          document_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user?.id || null,
          status: "pending_review",
        })
        .select()
        .single();
      if (error) throw error;

      // Audit
      await supabase.from("onboarding_audit_log").insert({
        entity_type: "learner_document",
        entity_id: data.id,
        action: "document_uploaded",
        performed_by: user?.id || null,
        details: {
          registration_id: registrationId,
          document_type: documentType,
          document_name: file.name,
        },
      });

      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["learner_documents", vars.registrationId] });
      qc.invalidateQueries({ queryKey: ["onboarding_audit_log"] });
    },
  });
}

export function useVerifyDocument() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      documentId,
      registrationId,
      status,
      rejectionReason,
      notes,
    }: {
      documentId: string;
      registrationId: string;
      status: "verified" | "rejected";
      rejectionReason?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("learner_documents")
        .update({
          status,
          rejection_reason: status === "rejected" ? rejectionReason : null,
          notes: notes || null,
          verified_by: user?.id || null,
          verified_at: new Date().toISOString(),
        })
        .eq("id", documentId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["learner_documents", vars.registrationId] });
      qc.invalidateQueries({ queryKey: ["onboarding_audit_log"] });
    },
  });
}

/** Check if all documents for a registration are verified */
export function useDocumentVerificationStatus(registrationId?: string) {
  const { data: docs, isLoading } = useLearnerDocuments(registrationId);

  if (isLoading || !docs) return { status: "loading" as const, allVerified: false, hasDocuments: false, pending: 0, rejected: 0, verified: 0 };

  const hasDocuments = docs.length > 0;
  const verified = docs.filter(d => d.status === "verified").length;
  const pending = docs.filter(d => d.status === "pending_review").length;
  const rejected = docs.filter(d => d.status === "rejected").length;
  const allVerified = hasDocuments && docs.every(d => d.status === "verified");

  return {
    status: allVerified ? "verified" as const : rejected > 0 ? "rejected" as const : "pending" as const,
    allVerified,
    hasDocuments,
    pending,
    rejected,
    verified,
    total: docs.length,
  };
}
