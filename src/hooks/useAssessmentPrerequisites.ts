import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const db = supabase as any;

export interface AssessmentPrerequisite {
  id: string;
  assessment_id: string;
  prerequisite_module_id: string | null;
  prerequisite_assessment_id: string | null;
  prerequisite_type: "completion" | "min_score";
  min_score: number | null;
  created_at: string;
}

export function useAssessmentPrerequisites(assessmentId: string | undefined) {
  return useQuery({
    queryKey: ["assessment_prerequisites", assessmentId],
    enabled: !!assessmentId,
    queryFn: async () => {
      const { data, error } = await db
        .from("assessment_prerequisites")
        .select("*")
        .eq("assessment_id", assessmentId);
      if (error) throw error;
      return (data ?? []) as AssessmentPrerequisite[];
    },
  });
}

export function useAddAssessmentPrerequisite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      assessment_id: string;
      prerequisite_module_id?: string | null;
      prerequisite_assessment_id?: string | null;
      prerequisite_type?: "completion" | "min_score";
      min_score?: number | null;
    }) => {
      const { data, error } = await db.from("assessment_prerequisites").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["assessment_prerequisites", vars.assessment_id] });
      toast.success("Prerequisite added");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteAssessmentPrerequisite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; assessment_id: string }) => {
      const { error } = await db.from("assessment_prerequisites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["assessment_prerequisites", vars.assessment_id] });
      toast.success("Prerequisite removed");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
