import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const db = supabase as any;

export interface LearnerStreak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_study_date: string | null;
  weekly_goal_minutes: number;
  updated_at: string;
}

export function useLearnerStreak() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["learner_streak", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await db
        .from("learner_streaks")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as LearnerStreak | null;
    },
    staleTime: 30_000,
  });
}

export function useWeeklyStudyMinutes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["weekly_study", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const { data, error } = await db
        .from("learner_study_log")
        .select("minutes, study_date")
        .eq("user_id", user!.id)
        .gte("study_date", weekStart.toISOString().split("T")[0]);
      if (error) throw error;
      const total = (data ?? []).reduce((s: number, r: any) => s + (r.minutes ?? 0), 0);
      const daysStudied = new Set((data ?? []).map((r: any) => r.study_date)).size;
      return { totalMinutes: total, daysStudied };
    },
    staleTime: 60_000,
  });
}

/** Record today's study activity and update streak */
export function useRecordStudyActivity() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ minutes = 1, activity = "content" }: { minutes?: number; activity?: string }) => {
      if (!user?.id) return;
      const today = new Date().toISOString().split("T")[0];

      // Upsert study log
      await db.from("learner_study_log").upsert(
        { user_id: user.id, study_date: today, minutes, activity },
        { onConflict: "user_id,study_date,activity" }
      );

      // Upsert streak
      const { data: existing } = await db
        .from("learner_streaks")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      const last = existing?.last_study_date;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().split("T")[0];

      let newStreak = existing?.current_streak ?? 0;
      if (!last || last < yStr) {
        // Streak broken or first day
        newStreak = last === today ? existing.current_streak : 1;
      } else if (last === yStr) {
        newStreak = (existing?.current_streak ?? 0) + 1;
      } else if (last === today) {
        newStreak = existing?.current_streak ?? 1;
      }

      const longest = Math.max(newStreak, existing?.longest_streak ?? 0);

      await db.from("learner_streaks").upsert(
        {
          user_id: user.id,
          current_streak: newStreak,
          longest_streak: longest,
          last_study_date: today,
          weekly_goal_minutes: existing?.weekly_goal_minutes ?? 60,
        },
        { onConflict: "user_id" }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["learner_streak"] });
      qc.invalidateQueries({ queryKey: ["weekly_study"] });
    },
  });
}

export function useUpdateWeeklyGoal() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (minutes: number) => {
      if (!user?.id) return;
      await db.from("learner_streaks").upsert(
        { user_id: user.id, weekly_goal_minutes: minutes },
        { onConflict: "user_id" }
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["learner_streak"] }),
  });
}
