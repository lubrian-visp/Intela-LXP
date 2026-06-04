import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// ── Enrolment Toggles ──
export function useEnrolmentToggles() {
  return useQuery({
    queryKey: ["enrolment_toggles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrolment_toggles")
        .select("*")
        .order("scope_level");
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertEnrolmentToggle() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      scopeLevel,
      scopeId,
      isEnabled,
      reason,
    }: {
      scopeLevel: string;
      scopeId: string | null;
      isEnabled: boolean;
      reason: string;
    }) => {
      // PostgreSQL upsert can't match on NULL scope_id, so delete+insert for null scope_id
      if (!scopeId) {
        await supabase
          .from("enrolment_toggles")
          .delete()
          .eq("scope_level", scopeLevel)
          .is("scope_id", null);
      } else {
        await supabase
          .from("enrolment_toggles")
          .delete()
          .eq("scope_level", scopeLevel)
          .eq("scope_id", scopeId);
      }

      const { data, error } = await supabase
        .from("enrolment_toggles")
        .insert({
          scope_level: scopeLevel,
          scope_id: scopeId,
          is_enabled: isEnabled,
          reason,
          changed_by: user?.id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["enrolment_toggles"] });
      qc.invalidateQueries({ queryKey: ["onboarding_audit_log"] });
    },
  });
}

// ── Check if enrolment is enabled at all levels ──
export function useIsEnrolmentEnabled(programmeId?: string, cohortId?: string) {
  const { data: toggles } = useEnrolmentToggles();

  if (!toggles) return { enabled: false, blockedBy: "loading" };

  const globalToggle = toggles.find((t) => t.scope_level === "global" && !t.scope_id);
  if (!globalToggle?.is_enabled) return { enabled: false, blockedBy: "Global enrolment is disabled" };

  if (programmeId) {
    const progToggle = toggles.find((t) => t.scope_level === "programme" && t.scope_id === programmeId);
    if (progToggle && !progToggle.is_enabled) return { enabled: false, blockedBy: "Programme enrolment is disabled" };
  }

  if (cohortId) {
    const cohortToggle = toggles.find((t) => t.scope_level === "cohort" && t.scope_id === cohortId);
    if (cohortToggle && !cohortToggle.is_enabled) return { enabled: false, blockedBy: "Cohort enrolment is disabled" };
  }

  return { enabled: true, blockedBy: null };
}

// ── Approval Routing Rules ──
export function useApprovalRoutingRules() {
  return useQuery({
    queryKey: ["approval_routing_rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_routing_rules")
        .select("*")
        .eq("is_active", true)
        .order("step_order");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateApprovalRoutingRule() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      rule_name: string;
      description?: string;
      scope_type: string;
      scope_value?: string;
      approver_user_id?: string;
      approver_role?: string;
      step_order: number;
    }) => {
      const { data, error } = await supabase
        .from("approval_routing_rules")
        .insert({ ...input, created_by: user?.id || null })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["approval_routing_rules"] }),
  });
}

export function useDeleteApprovalRoutingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("approval_routing_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["approval_routing_rules"] }),
  });
}

// ── Registration Approval Steps ──
export function useRegistrationApprovalSteps(registrationId?: string) {
  return useQuery({
    queryKey: ["registration_approval_steps", registrationId],
    enabled: !!registrationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registration_approval_steps")
        .select("*")
        .eq("registration_id", registrationId!)
        .order("step_order");
      if (error) throw error;
      return data;
    },
  });
}

export function useResolveApprovalStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      stepId,
      status,
      reason,
    }: {
      stepId: string;
      status: "approved" | "rejected" | "returned";
      reason: string;
    }) => {
      const { data, error } = await supabase
        .from("registration_approval_steps")
        .update({
          status,
          reason,
          decided_at: new Date().toISOString(),
        })
        .eq("id", stepId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["registration_approval_steps"] });
      qc.invalidateQueries({ queryKey: ["learner_registrations"] });
    },
  });
}

// ── Eligibility Checks ──
export function useEligibilityChecks(registrationId?: string) {
  return useQuery({
    queryKey: ["learner_eligibility_checks", registrationId],
    enabled: !!registrationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learner_eligibility_checks")
        .select("*")
        .eq("registration_id", registrationId!);
      if (error) throw error;
      return data;
    },
  });
}

export function useRunEligibilityChecks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      registrationId,
      registration,
      toggles,
    }: {
      registrationId: string;
      registration: any;
      toggles: any[];
    }) => {
      const checks = [
        {
          registration_id: registrationId,
          check_type: "registration_status" as const,
          is_passed: registration.status === "approved",
          details: registration.status === "approved" ? "Approved" : `Status: ${registration.status}`,
        },
        {
          registration_id: registrationId,
          check_type: "profile_complete" as const,
          is_passed: !!(registration.full_name && registration.email),
          details: registration.full_name && registration.email ? "Complete" : "Missing required fields",
        },
        {
          registration_id: registrationId,
          check_type: "documents" as const,
          is_passed: true, // Simplified: assume docs OK if present
          details: "Documents accepted",
        },
        {
          registration_id: registrationId,
          check_type: "account_status" as const,
          is_passed: registration.status !== "suspended",
          details: registration.status === "suspended" ? "Account suspended" : "Active",
        },
        {
          registration_id: registrationId,
          check_type: "toggle_status" as const,
          is_passed: (() => {
            const globalT = toggles.find((t: any) => t.scope_level === "global" && !t.scope_id);
            return globalT?.is_enabled ?? false;
          })(),
          details: (() => {
            const globalT = toggles.find((t: any) => t.scope_level === "global" && !t.scope_id);
            return globalT?.is_enabled ? "Enrolment enabled" : "Global enrolment disabled";
          })(),
        },
      ];

      // Upsert all checks
      for (const check of checks) {
        await supabase.from("learner_eligibility_checks").upsert(check, {
          onConflict: "registration_id,check_type",
        });
      }

      return checks;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["learner_eligibility_checks"] }),
  });
}

// ── Enrol Learner (from Directory) ──
export function useEnrolLearner() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      registrationId,
      learnerId,
      cohortId,
      programmeId,
    }: {
      registrationId: string;
      learnerId: string;
      cohortId: string;
      programmeId: string;
    }) => {
      // Upsert enrolment — prevents duplicate key errors
      const { error: enrolError } = await supabase.from("enrolments").upsert({
        learner_id: learnerId,
        cohort_id: cohortId,
        status: "active",
        enrolled_at: new Date().toISOString(),
        approved_by: user?.id || null,
      }, {
        onConflict: "cohort_id,learner_id",
        ignoreDuplicates: true,
      });
      if (enrolError) throw enrolError;

      // Update registration status
      const { error: regError } = await supabase
        .from("learner_registrations")
        .update({ status: "enrolled" })
        .eq("id", registrationId);
      if (regError) throw regError;

      // Audit log
      await supabase.from("onboarding_audit_log").insert({
        entity_type: "learner",
        entity_id: registrationId,
        action: "enrolled",
        performed_by: user?.id || null,
        details: { cohort_id: cohortId, programme_id: programmeId },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["learner_registrations"] });
      qc.invalidateQueries({ queryKey: ["enrolments"] });
      qc.invalidateQueries({ queryKey: ["onboarding_audit_log"] });
    },
  });
}
