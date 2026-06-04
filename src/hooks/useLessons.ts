import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  learning_objective: string | null;
  sequence_order: number;
  duration_minutes: number | null;
  is_mandatory: boolean;
  created_at: string;
  updated_at: string;
}

export function useLessons(moduleId: string | undefined) {
  return useQuery({
    queryKey: ["lessons", moduleId],
    enabled: !!moduleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("module_id", moduleId!)
        .order("sequence_order");
      if (error) throw error;
      return data as Lesson[];
    },
  });
}

export function useLessonsByProgramme(programmeId: string | undefined, moduleIds: string[]) {
  return useQuery({
    queryKey: ["lessons_by_programme", programmeId, moduleIds],
    enabled: !!programmeId && moduleIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .in("module_id", moduleIds)
        .order("sequence_order");
      if (error) throw error;
      return data as Lesson[];
    },
  });
}

export function useCreateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      module_id: string;
      title: string;
      description?: string;
      learning_objective?: string;
      sequence_order?: number;
      duration_minutes?: number;
      is_mandatory?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("lessons")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as Lesson;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["lessons", data.module_id] });
      qc.invalidateQueries({ queryKey: ["lessons_by_programme"] });
    },
  });
}

export function useUpdateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; module_id?: string; title?: string; description?: string; learning_objective?: string; sequence_order?: number; duration_minutes?: number; is_mandatory?: boolean }) => {
      const { data, error } = await supabase
        .from("lessons")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Lesson;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["lessons", data.module_id] });
      qc.invalidateQueries({ queryKey: ["lessons_by_programme"] });
    },
  });
}

export function useDeleteLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, moduleId }: { id: string; moduleId: string }) => {
      const { error } = await supabase.from("lessons").delete().eq("id", id);
      if (error) throw error;
      return { moduleId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["lessons", data.moduleId] });
      qc.invalidateQueries({ queryKey: ["lessons_by_programme"] });
    },
  });
}

export function useReorderLessons() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { id: string; sequence_order: number }[]) => {
      const promises = updates.map((u) =>
        supabase.from("lessons").update({ sequence_order: u.sequence_order }).eq("id", u.id)
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lessons"] });
      qc.invalidateQueries({ queryKey: ["lessons_by_programme"] });
    },
  });
}
