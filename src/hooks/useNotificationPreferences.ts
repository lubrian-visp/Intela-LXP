import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const CATEGORIES = [
  { key: "general", label: "General & Enrolments", description: "Enrolment status changes, programme updates" },
  { key: "approval", label: "Approvals", description: "Approval requests and decisions" },
  { key: "submission", label: "Assessments", description: "Assessment grading, scores, feedback" },
  { key: "moderation", label: "Moderation", description: "Content moderation alerts" },
] as const;

export { CATEGORIES };

export function useNotificationPreferences() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notification-preferences", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user!.id);
      return data ?? [];
    },
  });
}

export function useUpsertPreference() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (pref: { category: string; in_app_enabled: boolean; email_enabled: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("notification_preferences")
        .upsert(
          { user_id: user.id, ...pref },
          { onConflict: "user_id,category" }
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notification-preferences"] }),
  });
}
