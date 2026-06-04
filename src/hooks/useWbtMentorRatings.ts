import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const db = supabase as any;

export interface WbtMentorRating {
  id: string;
  project_id: string;
  mentor_id: string;
  rated_by: string;
  rater_role: string;
  communication_score: number;
  technical_score: number;
  mentorship_score: number;
  overall_score: number;
  feedback: string | null;
  is_anonymous: boolean;
  created_at: string;
}

export interface MentorReputation {
  mentor_id: string;
  total_ratings: number;
  avg_communication: number;
  avg_technical: number;
  avg_mentorship: number;
  avg_overall: number;
}

export function useWbtMentorRatings(mentorId: string | undefined) {
  return useQuery({
    queryKey: ["wbt-mentor-ratings", mentorId],
    enabled: !!mentorId,
    queryFn: async () => {
      const { data, error } = await db.from("wbt_mentor_ratings").select("*").eq("mentor_id", mentorId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as WbtMentorRating[];
    },
  });
}

export function useWbtProjectRatings(projectId: string | undefined) {
  return useQuery({
    queryKey: ["wbt-project-ratings", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await db.from("wbt_mentor_ratings").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as WbtMentorRating[];
    },
  });
}

export function useMentorReputation(mentorId: string | undefined) {
  return useQuery({
    queryKey: ["wbt-mentor-reputation", mentorId],
    enabled: !!mentorId,
    queryFn: async () => {
      const { data, error } = await db.from("wbt_mentor_ratings").select("*").eq("mentor_id", mentorId);
      if (error) throw error;
      const ratings = data as WbtMentorRating[];
      if (ratings.length === 0) return null;
      const rep: MentorReputation = {
        mentor_id: mentorId!,
        total_ratings: ratings.length,
        avg_communication: ratings.reduce((s, r) => s + r.communication_score, 0) / ratings.length,
        avg_technical: ratings.reduce((s, r) => s + r.technical_score, 0) / ratings.length,
        avg_mentorship: ratings.reduce((s, r) => s + r.mentorship_score, 0) / ratings.length,
        avg_overall: ratings.reduce((s, r) => s + r.overall_score, 0) / ratings.length,
      };
      return rep;
    },
  });
}

export function useRateMentor() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (rating: Omit<WbtMentorRating, "id" | "rated_by" | "created_at">) => {
      const { data, error } = await db.from("wbt_mentor_ratings").insert({
        ...rating,
        rated_by: user?.id,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["wbt-mentor-ratings"] });
      qc.invalidateQueries({ queryKey: ["wbt-project-ratings"] });
      qc.invalidateQueries({ queryKey: ["wbt-mentor-reputation", data.mentor_id] });
      toast({ title: "Rating submitted. Thank you!" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to submit rating", description: err.message, variant: "destructive" });
    },
  });
}
