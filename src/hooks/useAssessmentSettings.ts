import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AssessmentSettings {
  id: string;
  assessment_id: string;
  time_limit_minutes: number | null;
  attempts_allowed: number | null;
  availability_start: string | null;
  availability_end: string | null;
  display_mode: string;
  allow_backtracking: boolean;
  show_question_flagging: boolean;
  feedback_release: string;
  randomise_questions: boolean;
  randomise_options: boolean;
  show_correct_answers: boolean;
  require_lockdown_browser: boolean;
  access_code: string | null;
  ip_restrictions: string[] | null;
  created_at: string;
  updated_at: string;
}

export function useAssessmentSettings(assessmentId: string | undefined) {
  return useQuery({
    queryKey: ["assessment_settings", assessmentId],
    enabled: !!assessmentId,
    queryFn: async () => {
      // Use the safe view that hides access_code from non-staff users
      const { data, error } = await supabase
        .from("assessment_settings_safe" as any)
        .select("*")
        .eq("assessment_id", assessmentId!)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as (AssessmentSettings & { requires_access_code?: boolean })) || null;
    },
  });
}

export function useUpsertAssessmentSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<AssessmentSettings> & { assessment_id: string }) => {
      const { data, error } = await supabase
        .from("assessment_settings")
        .upsert(input, { onConflict: "assessment_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["assessment_settings", data.assessment_id] });
      toast.success("Assessment settings saved");
    },
    onError: (err: any) => toast.error(err.message),
  });
}
