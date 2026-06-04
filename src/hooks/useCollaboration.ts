import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// ── Session Chat ──
export function useSessionChat(sessionId?: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["session_chat", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_chat_messages")
        .select("*")
        .eq("session_id", sessionId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`chat-${sessionId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "session_chat_messages",
        filter: `session_id=eq.${sessionId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ["session_chat", sessionId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId, qc]);

  return query;
}

export function useSendChatMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { session_id: string; user_id: string; message: string; message_type?: string }) => {
      const { data, error } = await supabase.from("session_chat_messages").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["session_chat", vars.session_id] }),
  });
}

// ── Discussion Threads ──
export function useDiscussionThreads(scopeType?: string, scopeId?: string) {
  return useQuery({
    queryKey: ["discussion_threads", scopeType, scopeId],
    queryFn: async () => {
      let q = supabase.from("discussion_threads").select("*").order("is_pinned", { ascending: false }).order("last_activity_at", { ascending: false });
      if (scopeType) q = q.eq("scope_type", scopeType);
      if (scopeId) q = q.eq("scope_id", scopeId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; body?: string; scope_type: string; scope_id: string; author_id: string }) => {
      const { data, error } = await supabase.from("discussion_threads").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discussion_threads"] }),
  });
}

export function useUpdateThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; is_pinned?: boolean; is_locked?: boolean; title?: string }) => {
      const { data, error } = await supabase.from("discussion_threads").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discussion_threads"] }),
  });
}

// ── Discussion Posts ──
export function useDiscussionPosts(threadId?: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["discussion_posts", threadId],
    enabled: !!threadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discussion_posts")
        .select("*")
        .eq("thread_id", threadId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!threadId) return;
    const channel = supabase
      .channel(`posts-${threadId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "discussion_posts",
        filter: `thread_id=eq.${threadId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ["discussion_posts", threadId] });
        qc.invalidateQueries({ queryKey: ["discussion_threads"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [threadId, qc]);

  return query;
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { thread_id: string; author_id: string; body: string; parent_post_id?: string }) => {
      const { data, error } = await supabase.from("discussion_posts").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["discussion_posts", vars.thread_id] });
      qc.invalidateQueries({ queryKey: ["discussion_threads"] });
    },
  });
}

// ── Announcements ──
export function useAnnouncements(filters?: { scopeType?: string; scopeId?: string; publishedOnly?: boolean }) {
  return useQuery({
    queryKey: ["announcements", filters],
    queryFn: async () => {
      let q = supabase.from("announcements").select("*").order("created_at", { ascending: false });
      if (filters?.scopeType) q = q.eq("scope_type", filters.scopeType);
      if (filters?.scopeId) q = q.eq("scope_id", filters.scopeId);
      if (filters?.publishedOnly !== false) q = q.eq("is_published", true);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string; body: string; priority?: string; scope_type?: string;
      scope_id?: string; author_id: string; is_published?: boolean; published_at?: string;
    }) => {
      const { data, error } = await supabase.from("announcements").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });
}

export function useUpdateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from("announcements").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });
}

// ── Announcement Read Receipts ──
export function useAnnouncementReads(userId?: string) {
  return useQuery({
    queryKey: ["announcement_reads", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("announcement_reads").select("*").eq("user_id", userId!);
      if (error) throw error;
      return data;
    },
  });
}

export function useMarkAnnouncementRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { announcement_id: string; user_id: string }) => {
      const { data, error } = await supabase.from("announcement_reads").upsert(input, { onConflict: "announcement_id,user_id" }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcement_reads"] }),
  });
}

// ── Session Notes ──
export function useSessionNotes(sessionId?: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["session_notes", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_notes")
        .select("*")
        .eq("session_id", sessionId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`notes-${sessionId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "session_notes",
        filter: `session_id=eq.${sessionId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ["session_notes", sessionId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId, qc]);

  return query;
}

export function useCreateSessionNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { session_id: string; author_id: string; content: string; note_type?: string; is_shared?: boolean }) => {
      const { data, error } = await supabase.from("session_notes").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["session_notes", vars.session_id] }),
  });
}

export function useUpdateSessionNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; content?: string; note_type?: string; is_shared?: boolean }) => {
      const { data, error } = await supabase.from("session_notes").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["session_notes"] }),
  });
}

export function useDeleteSessionNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("session_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["session_notes"] }),
  });
}
