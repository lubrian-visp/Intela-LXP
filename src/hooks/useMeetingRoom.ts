import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// ── Meeting Participants ──
export function useMeetingParticipants(sessionId?: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["meeting_participants", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_participants")
        .select("*")
        .eq("session_id", sessionId!)
        .is("left_at", null)
        .order("joined_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`participants-${sessionId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "meeting_participants",
        filter: `session_id=eq.${sessionId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ["meeting_participants", sessionId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId, qc]);

  return query;
}

export function useJoinMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      session_id: string;
      user_id: string;
      display_name?: string;
      role?: string;
      status?: string;
    }) => {
      const { data, error } = await supabase
        .from("meeting_participants")
        .upsert(
          {
            session_id: input.session_id,
            user_id: input.user_id,
            display_name: input.display_name || "Participant",
            role: input.role || "attendee",
            status: input.status || "joined",
            joined_at: new Date().toISOString(),
            left_at: null,
          },
          { onConflict: "session_id,user_id" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["meeting_participants", vars.session_id] }),
  });
}

export function useLeaveMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, userId }: { sessionId: string; userId: string }) => {
      const { error } = await supabase
        .from("meeting_participants")
        .update({ left_at: new Date().toISOString(), status: "left" })
        .eq("session_id", sessionId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["meeting_participants", vars.sessionId] }),
  });
}

export function useUpdateParticipant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId,
      userId,
      ...updates
    }: {
      sessionId: string;
      userId: string;
      is_hand_raised?: boolean;
      is_muted?: boolean;
      is_video_on?: boolean;
      is_screen_sharing?: boolean;
      status?: string;
    }) => {
      const { error } = await supabase
        .from("meeting_participants")
        .update(updates)
        .eq("session_id", sessionId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["meeting_participants", vars.sessionId] }),
  });
}

// ── Meeting Reactions ──
export function useMeetingReactions(sessionId?: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["meeting_reactions", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_reactions")
        .select("*")
        .eq("session_id", sessionId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`reactions-${sessionId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "meeting_reactions",
        filter: `session_id=eq.${sessionId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ["meeting_reactions", sessionId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId, qc]);

  return query;
}

export function useSendReaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { session_id: string; user_id: string; reaction_type: string }) => {
      const { data, error } = await supabase
        .from("meeting_reactions")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["meeting_reactions", vars.session_id] }),
  });
}
