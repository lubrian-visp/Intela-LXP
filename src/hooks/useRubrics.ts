import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Rubric {
  id: string;
  name: string;
  description: string | null;
  rubric_type: string;
  programme_id: string | null;
  max_score: number | null;
  is_reusable: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RubricCriterion {
  id: string;
  rubric_id: string;
  criterion_name: string;
  description: string | null;
  max_points: number;
  sequence_order: number;
  performance_levels: { level: string; points: number; description: string }[];
  created_at: string;
  updated_at: string;
}

export function useRubrics(programmeId?: string) {
  return useQuery({
    queryKey: ["rubrics", programmeId],
    queryFn: async () => {
      let query = supabase.from("rubrics").select("*").order("created_at", { ascending: false });
      if (programmeId) {
        query = query.or(`programme_id.eq.${programmeId},is_reusable.eq.true`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Rubric[];
    },
  });
}

export function useRubricCriteria(rubricId: string | undefined) {
  return useQuery({
    queryKey: ["rubric_criteria", rubricId],
    enabled: !!rubricId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rubric_criteria")
        .select("*")
        .eq("rubric_id", rubricId!)
        .order("sequence_order");
      if (error) throw error;
      return (data as any[]).map((d) => ({
        ...d,
        performance_levels: typeof d.performance_levels === "string" ? JSON.parse(d.performance_levels) : d.performance_levels,
      })) as RubricCriterion[];
    },
  });
}

export function useCreateRubric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; rubric_type?: string; programme_id?: string; max_score?: number }) => {
      const { data, error } = await supabase.from("rubrics").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rubrics"] });
      toast.success("Rubric created");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useCreateRubricCriterion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<RubricCriterion> & { rubric_id: string; criterion_name: string }) => {
      const { data, error } = await supabase.from("rubric_criteria").insert({
        ...input,
        performance_levels: JSON.stringify(input.performance_levels || [
          { level: "Excellent", points: 10, description: "" },
          { level: "Good", points: 7, description: "" },
          { level: "Satisfactory", points: 5, description: "" },
          { level: "Needs Improvement", points: 2, description: "" },
        ]),
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["rubric_criteria", vars.rubric_id] });
      toast.success("Criterion added");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useUpdateRubricCriterion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; rubric_id: string } & Partial<RubricCriterion>) => {
      const { id, rubric_id, ...rest } = input;
      const updateData: any = { ...rest };
      if (rest.performance_levels) {
        updateData.performance_levels = JSON.stringify(rest.performance_levels);
      }
      const { data, error } = await supabase.from("rubric_criteria").update(updateData).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["rubric_criteria", vars.rubric_id] });
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useDeleteRubricCriterion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; rubric_id: string }) => {
      const { error } = await supabase.from("rubric_criteria").delete().eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["rubric_criteria", vars.rubric_id] });
      toast.success("Criterion removed");
    },
  });
}

export function useLinkRubricToAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { assessment_id: string; rubric_id: string }) => {
      const { data, error } = await supabase.from("assessment_rubrics").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assessment_rubrics"] });
      toast.success("Rubric linked to assessment");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useAssessmentRubrics(assessmentId: string | undefined) {
  return useQuery({
    queryKey: ["assessment_rubrics", assessmentId],
    enabled: !!assessmentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_rubrics")
        .select("*, rubrics(*)")
        .eq("assessment_id", assessmentId!);
      if (error) throw error;
      return data as any[];
    },
  });
}
