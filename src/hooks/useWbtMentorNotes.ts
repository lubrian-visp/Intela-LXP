import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const db = supabase as any;

export interface WbtMentorNote {
  id: string;
  project_id: string;
  mentor_id: string;
  learner_id: string | null;
  note_type: string;
  content: string;
  is_private: boolean;
  updated_at: string;
  created_at: string;
}

export function useWbtMentorNotes(projectId: string | undefined) {
  return useQuery({
    queryKey: ["wbt-mentor-notes", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await db.from("wbt_mentor_notes").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as WbtMentorNote[];
    },
  });
}

export function useCreateMentorNote() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (note: Partial<WbtMentorNote>) => {
      const { data, error } = await db.from("wbt_mentor_notes").insert({ ...note, mentor_id: user?.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wbt-mentor-notes"] });
      toast({ title: "Note saved" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to save note", description: err.message, variant: "destructive" });
    },
  });
}

export function useUpdateMentorNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await db.from("wbt_mentor_notes").update({ content }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wbt-mentor-notes"] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update note", description: err.message, variant: "destructive" });
    },
  });
}

export function useDeleteMentorNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("wbt_mentor_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wbt-mentor-notes"] });
      toast({ title: "Note deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to delete note", description: err.message, variant: "destructive" });
    },
  });
}
