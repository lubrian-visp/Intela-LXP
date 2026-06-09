/**
 * useConsentRecords — PoPIA consent management
 * Learners can view and withdraw consent for each processing purpose.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const db = supabase as any;

export const CONSENT_PURPOSES = [
  {
    key:         "marketing_comms",
    label:       "Marketing communications",
    description: "Receiving newsletters, promotions, and programme updates by email or SMS.",
    required:    false,
  },
  {
    key:         "analytics_tracking",
    label:       "Analytics & performance tracking",
    description: "Usage data collected to improve platform performance and your learning experience.",
    required:    false,
  },
  {
    key:         "sponsor_sharing",
    label:       "Third-party data sharing (sponsors)",
    description: "Sharing your progress and completion data with your programme sponsor or employer.",
    required:    false,
  },
  {
    key:         "ai_profiling",
    label:       "Automated profiling & AI recommendations",
    description: "Using your learning behaviour to generate personalised course recommendations.",
    required:    false,
  },
  {
    key:         "essential_processing",
    label:       "Essential platform processing",
    description: "Processing required to deliver the LXP service (assessment, enrolment, credentials). This cannot be withdrawn.",
    required:    true,
  },
];

export function useMyConsents() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["consent_records", user?.id],
    enabled:  !!user?.id,
    queryFn:  async () => {
      const { data, error } = await db
        .from("consent_records")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;

      // Merge DB records with purpose definitions
      const dbMap = Object.fromEntries((data ?? []).map((r: any) => [r.purpose_key, r]));
      return CONSENT_PURPOSES.map(p => ({
        ...p,
        record:    dbMap[p.key] ?? null,
        consented: dbMap[p.key]?.consented ?? false,
        withdrawn_at: dbMap[p.key]?.withdrawn_at ?? null,
        consented_at: dbMap[p.key]?.consented_at ?? null,
      }));
    },
    staleTime: 30_000,
  });
}

export function useUpdateConsent() {
  const { user } = useAuth();
  const qc       = useQueryClient();
  return useMutation({
    mutationFn: async ({ purposeKey, consented }: { purposeKey: string; consented: boolean }) => {
      const purpose = CONSENT_PURPOSES.find(p => p.key === purposeKey);
      if (!purpose) throw new Error("Unknown consent purpose");
      if (purpose.required) throw new Error("Essential processing consent cannot be withdrawn");

      const now = new Date().toISOString();
      const { data, error } = await db.from("consent_records").upsert({
        user_id:      user!.id,
        purpose:      purpose.label,
        purpose_key:  purposeKey,
        consented,
        consented_at: consented ? now : null,
        withdrawn_at: consented ? null : now,
        updated_at:   now,
      }, { onConflict: "user_id,purpose_key" }).select().single();
      if (error) throw error;

      // Audit log
      db.from("onboarding_audit_log").insert({
        action:      consented ? "consent_granted" : "consent_withdrawn",
        entity_type: "consent",
        entity_id:   data.id,
        performed_by: user!.id,
        details: { purpose_key: purposeKey, purpose_label: purpose.label },
      }).then(() => {});

      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["consent_records"] });
      toast.success(vars.consented ? "Consent granted" : "Consent withdrawn successfully");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// Admin: read all consent records for PoPIA dashboard counts
export function useConsentAuditCounts() {
  return useQuery({
    queryKey: ["consent_audit_counts"],
    queryFn: async () => {
      const { data, error } = await db
        .from("consent_records")
        .select("purpose_key, consented, withdrawn_at");
      if (error) throw error;

      const byPurpose: Record<string, { consented: number; declined: number; withdrawals: number }> = {};
      (data ?? []).forEach((r: any) => {
        if (!byPurpose[r.purpose_key]) byPurpose[r.purpose_key] = { consented: 0, declined: 0, withdrawals: 0 };
        if (r.consented) byPurpose[r.purpose_key].consented++;
        else             byPurpose[r.purpose_key].declined++;
        if (r.withdrawn_at) byPurpose[r.purpose_key].withdrawals++;
      });
      return byPurpose;
    },
    staleTime: 60_000,
  });
}
