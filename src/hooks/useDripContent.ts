import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const db = supabase as any;

export interface DripSchedule {
  id: string;
  programme_id: string;
  module_id: string | null;
  lesson_id: string | null;
  content_block_id: string | null;
  drip_type: string;
  drip_value: number;
  drip_date: string | null;
  is_sample: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompletionConfig {
  id: string;
  programme_id: string;
  completion_message: string;
  show_certificate: boolean;
  show_social_share: boolean;
  show_next_recommendations: boolean;
  recommended_programme_ids: string[];
  custom_html: string | null;
  redirect_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useDripSchedules(programmeId?: string) {
  return useQuery({
    queryKey: ["drip-schedules", programmeId],
    enabled: !!programmeId,
    queryFn: async () => {
      const { data, error } = await db
        .from("drip_schedules")
        .select("*")
        .eq("programme_id", programmeId)
        .order("drip_value");
      if (error) throw error;
      return (data ?? []) as DripSchedule[];
    },
  });
}

export function useCreateDripSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<DripSchedule>) => {
      const { data, error } = await db.from("drip_schedules").insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["drip-schedules", vars.programme_id] });
      toast.success("Drip schedule created");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateDripSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<DripSchedule> & { id: string }) => {
      const { error } = await db.from("drip_schedules").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drip-schedules"] });
      toast.success("Drip schedule updated");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteDripSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("drip_schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drip-schedules"] });
      toast.success("Drip schedule deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useCompletionConfig(programmeId: string | null) {
  return useQuery({
    queryKey: ["completion-config", programmeId],
    enabled: !!programmeId,
    queryFn: async () => {
      const { data, error } = await db
        .from("programme_completion_config")
        .select("*")
        .eq("programme_id", programmeId)
        .maybeSingle();
      if (error) throw error;
      return data as CompletionConfig | null;
    },
  });
}

export function useUpsertCompletionConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<CompletionConfig> & { programme_id: string }) => {
      const { data, error } = await db
        .from("programme_completion_config")
        .upsert(values, { onConflict: "programme_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["completion-config", vars.programme_id] });
      toast.success("Completion configuration saved");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
