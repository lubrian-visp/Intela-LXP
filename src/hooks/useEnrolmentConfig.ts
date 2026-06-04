import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const db = supabase as any;

export interface EnrolmentConfig {
  id: string;
  programme_id: string;
  enrolment_mode: string;
  price: number;
  currency: string;
  recurring_interval: string | null;
  free_trial_days: number;
  capacity_limit: number | null;
  waitlist_enabled: boolean;
  enrolment_start: string | null;
  enrolment_end: string | null;
  duration_days: number | null;
  duration_type: string;
  duration_end_date: string | null;
  allow_re_enrolment: boolean;
  coupon_codes: any[];
  gateway_key: string | null;
  prerequisite_programme_ids: string[];
  created_at: string;
  updated_at: string;
}

export function useEnrolmentConfig(programmeId: string | null) {
  return useQuery({
    queryKey: ["enrolment-config", programmeId],
    enabled: !!programmeId,
    queryFn: async () => {
      const { data, error } = await db
        .from("programme_enrolment_config")
        .select("*")
        .eq("programme_id", programmeId)
        .maybeSingle();
      if (error) throw error;
      return data as EnrolmentConfig | null;
    },
  });
}

export function useUpsertEnrolmentConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<EnrolmentConfig> & { programme_id: string }) => {
      const { data, error } = await db
        .from("programme_enrolment_config")
        .upsert(values, { onConflict: "programme_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["enrolment-config", vars.programme_id] });
      toast.success("Enrolment configuration saved");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
