import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Badge {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  category: string;
  criteria_type: string;
  criteria_value: any;
  points_value: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LearnerBadge {
  id: string;
  learner_id: string;
  badge_id: string;
  enrolment_id: string | null;
  earned_at: string;
  awarded_by: string | null;
  badges?: Badge;
}

export interface LearnerPoints {
  id: string;
  learner_id: string;
  enrolment_id: string | null;
  points: number;
  reason: string;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
}

/** Fetch all badges */
export function useBadges() {
  return useQuery({
    queryKey: ["badges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("badges")
        .select("*")
        .eq("is_active", true)
        .order("category");
      if (error) throw error;
      return data as Badge[];
    },
  });
}

/** Fetch learner's earned badges */
export function useLearnerBadges(learnerId: string | undefined) {
  return useQuery({
    queryKey: ["learner_badges", learnerId],
    enabled: !!learnerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learner_badges")
        .select("*, badges(*)")
        .eq("learner_id", learnerId!);
      if (error) throw error;
      return data as LearnerBadge[];
    },
  });
}

/** Fetch learner's total points */
export function useLearnerPoints(learnerId: string | undefined) {
  return useQuery({
    queryKey: ["learner_points", learnerId],
    enabled: !!learnerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learner_points")
        .select("*")
        .eq("learner_id", learnerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as LearnerPoints[];
    },
  });
}

/** Award points to a learner */
export function useAwardPoints() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      learner_id: string;
      enrolment_id?: string;
      points: number;
      reason: string;
      reference_type?: string;
      reference_id?: string;
    }) => {
      const { data, error } = await supabase.from("learner_points").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["learner_points", vars.learner_id] });
    },
  });
}

/** Award a badge to a learner */
export function useAwardBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      learner_id: string;
      badge_id: string;
      enrolment_id?: string;
      awarded_by?: string;
    }) => {
      const { data, error } = await supabase.from("learner_badges").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["learner_badges", vars.learner_id] });
      toast.success("Badge awarded!");
    },
    onError: (err: any) => {
      if (err.message?.includes("duplicate")) {
        toast.info("Learner already has this badge");
      } else {
        toast.error(err.message);
      }
    },
  });
}

/** Create a badge definition (admin) */
export function useCreateBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Badge>) => {
      const { data, error } = await supabase.from("badges").insert(input as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["badges"] });
      toast.success("Badge created");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

/** Fetch leaderboard (top learners by points) */
export function useLeaderboard(limit = 20) {
  return useQuery({
    queryKey: ["leaderboard", limit],
    queryFn: async () => {
      // Aggregate points per learner
      const { data, error } = await supabase
        .from("learner_points")
        .select("learner_id, points");
      if (error) throw error;

      // Aggregate in JS
      const totals: Record<string, number> = {};
      (data as any[]).forEach((p: any) => {
        totals[p.learner_id] = (totals[p.learner_id] || 0) + p.points;
      });

      // Get profiles for top learners
      const sorted = Object.entries(totals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit);

      if (sorted.length === 0) return [];

      const learnerIds = sorted.map(([id]) => id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", learnerIds);

      const profileMap: Record<string, any> = {};
      (profiles ?? []).forEach((p: any) => { profileMap[p.user_id] = p; });

      return sorted.map(([learnerId, totalPoints], index) => ({
        rank: index + 1,
        learner_id: learnerId,
        total_points: totalPoints,
        full_name: profileMap[learnerId]?.full_name || "Unknown",
        avatar_url: profileMap[learnerId]?.avatar_url || null,
      }));
    },
  });
}
