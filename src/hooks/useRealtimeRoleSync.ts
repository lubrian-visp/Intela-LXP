import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Subscribes to real-time changes on the user_roles table for the current user.
 * When roles are added or removed by an admin, the user's permission set
 * refreshes instantly without requiring a page reload or re-login.
 */
export function useRealtimeRoleSync() {
  const { user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`role-sync-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_roles",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Instantly refresh roles + profile from server
          refreshProfile();
          // Invalidate any cached permission-dependent queries
          queryClient.invalidateQueries({ queryKey: ["role-definitions"] });
          queryClient.invalidateQueries({ queryKey: ["staff-role-assignments"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refreshProfile, queryClient]);
}
