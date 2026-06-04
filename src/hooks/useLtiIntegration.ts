/**
 * LTI 1.3 integration hooks.
 *
 * NOTE (F6.1): This integration is "LTI-ready" — it implements the LTI 1.3
 * Advantage message flow (OIDC login init, deep linking and AGS grade
 * passback). It has NOT yet been validated against the IMS Global Reference
 * Implementation tool consumer round-trip, so it must be marketed as
 * "LTI-ready" rather than "LTI-certified" until the conformance log is
 * recorded against the certified suite.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/** Public conformance label — surface this in any badge/marketing copy. */
export const LTI_CONFORMANCE_STATUS = "LTI-ready (1.3 message flow implemented; IMS certification pending)";

export interface LtiRegistration {
  id: string;
  platform_name: string;
  issuer: string;
  client_id: string;
  auth_endpoint: string;
  token_endpoint: string;
  jwks_endpoint: string;
  deployment_id: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LtiResourceLink {
  id: string;
  registration_id: string;
  assessment_id: string;
  resource_link_id: string;
  title: string | null;
  created_at: string;
}

/** Fetch all LTI registrations */
export function useLtiRegistrations() {
  return useQuery({
    queryKey: ["lti_registrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lti_registrations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as LtiRegistration[];
    },
  });
}

/** Create an LTI registration */
export function useCreateLtiRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<LtiRegistration, "id" | "created_at" | "updated_at" | "created_by">) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("lti_registrations")
        .insert({ ...input, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lti_registrations"] });
      toast.success("LTI platform registered");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

/** Delete an LTI registration */
export function useDeleteLtiRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lti_registrations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lti_registrations"] });
      toast.success("LTI platform removed");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

/** Fetch resource links for an assessment */
export function useLtiResourceLinks(assessmentId: string | undefined) {
  return useQuery({
    queryKey: ["lti_resource_links", assessmentId],
    enabled: !!assessmentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lti_resource_links")
        .select("*, lti_registrations(*)")
        .eq("assessment_id", assessmentId!);
      if (error) throw error;
      return data as any[];
    },
  });
}

/** Create a resource link */
export function useCreateLtiResourceLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { registration_id: string; assessment_id: string; resource_link_id: string; title?: string }) => {
      const { data, error } = await supabase
        .from("lti_resource_links")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["lti_resource_links", vars.assessment_id] });
      toast.success("LTI resource link created");
    },
    onError: (err: any) => toast.error(err.message),
  });
}
