import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useLearnerContentProgress(enrolmentId?: string, learnerId?: string) {
  return useQuery({
    queryKey: ["learner_content_progress", enrolmentId],
    enabled: !!enrolmentId && !!learnerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learner_content_progress")
        .select("*")
        .eq("enrolment_id", enrolmentId!)
        .eq("learner_id", learnerId!);
      if (error) throw error;
      return data;
    },
  });
}

export function useToggleBlockCompletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      learner_id: string;
      content_block_id: string;
      module_id: string;
      enrolment_id: string;
      is_completed: boolean;
    }) => {
      const { data, error } = await supabase
        .from("learner_content_progress")
        .upsert(
          {
            learner_id: input.learner_id,
            content_block_id: input.content_block_id,
            module_id: input.module_id,
            enrolment_id: input.enrolment_id,
            is_completed: input.is_completed,
            completed_at: input.is_completed ? new Date().toISOString() : null,
          },
          { onConflict: "learner_id,content_block_id,enrolment_id" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["learner_content_progress", data.enrolment_id] });
    },
  });
}

export function useLearnerNotes(enrolmentId?: string, learnerId?: string) {
  return useQuery({
    queryKey: ["learner_notes", enrolmentId],
    enabled: !!enrolmentId && !!learnerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learner_notes")
        .select("*")
        .eq("enrolment_id", enrolmentId!)
        .eq("learner_id", learnerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      learner_id: string;
      content_block_id?: string;
      module_id?: string;
      enrolment_id: string;
      note_text: string;
    }) => {
      const { data, error } = await supabase
        .from("learner_notes")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["learner_notes", data.enrolment_id] });
    },
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, enrolmentId }: { id: string; enrolmentId: string }) => {
      const { error } = await supabase.from("learner_notes").delete().eq("id", id);
      if (error) throw error;
      return { enrolmentId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["learner_notes", data.enrolmentId] });
    },
  });
}

export function useLearnerBookmarks(enrolmentId?: string, learnerId?: string) {
  return useQuery({
    queryKey: ["learner_bookmarks", enrolmentId],
    enabled: !!enrolmentId && !!learnerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learner_bookmarks")
        .select("*")
        .eq("enrolment_id", enrolmentId!)
        .eq("learner_id", learnerId!);
      if (error) throw error;
      return data;
    },
  });
}

export function useToggleBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      learner_id: string;
      content_block_id: string;
      enrolment_id: string;
      isBookmarked: boolean;
    }) => {
      if (input.isBookmarked) {
        // Remove bookmark
        const { error } = await supabase
          .from("learner_bookmarks")
          .delete()
          .eq("learner_id", input.learner_id)
          .eq("content_block_id", input.content_block_id)
          .eq("enrolment_id", input.enrolment_id);
        if (error) throw error;
      } else {
        // Add bookmark
        const { error } = await supabase
          .from("learner_bookmarks")
          .insert({
            learner_id: input.learner_id,
            content_block_id: input.content_block_id,
            enrolment_id: input.enrolment_id,
          });
        if (error) throw error;
      }
      return { enrolment_id: input.enrolment_id };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["learner_bookmarks", data.enrolment_id] });
    },
  });
}
