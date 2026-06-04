import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  category: string;
  reference_table: string | null;
  reference_id: string | null;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

export function useNotifications(limit = 20) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notifications", user?.id, limit],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as Notification[];
    },
    staleTime: 60_000, // 1 min stale — realtime handles updates
    refetchInterval: 60_000,
  });
}

export function useUnreadCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notifications-unread-count", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("is_read", false);
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}

export function useMarkAllRead() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}

export function useCreateNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      user_id: string;
      title: string;
      body?: string;
      category?: string;
      reference_table?: string;
      reference_id?: string;
      action_url?: string;
    }) => {
      const { error } = await supabase.from("notifications").insert({
        user_id: input.user_id,
        title: input.title,
        body: input.body ?? null,
        category: input.category ?? "general",
        reference_table: input.reference_table ?? null,
        reference_id: input.reference_id ?? null,
        action_url: input.action_url ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}

/** Notify all users with a given role */
export function useNotifyByRole() {
  const createNotification = useCreateNotification();
  return useMutation({
    mutationFn: async (input: {
      role: string;
      title: string;
      body?: string;
      category?: string;
      reference_table?: string;
      reference_id?: string | null;
      action_url?: string;
    }) => {
      // Find all users with the target role
      const { data: roleUsers, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", input.role as any);
      if (error) throw error;
      if (!roleUsers?.length) return;

      // Create a notification for each user
      const inserts = roleUsers.map((ru) => ({
        user_id: ru.user_id,
        title: input.title,
        body: input.body ?? null,
        category: input.category ?? "approval",
        reference_table: input.reference_table ?? null,
        reference_id: input.reference_id ?? null,
        action_url: input.action_url ?? null,
      }));

      const { error: insertErr } = await supabase.from("notifications").insert(inserts);
      if (insertErr) throw insertErr;
    },
  });
}

/** Subscribe to realtime notification inserts for the current user */
export function useRealtimeNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["notifications"] });
          qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);
}
