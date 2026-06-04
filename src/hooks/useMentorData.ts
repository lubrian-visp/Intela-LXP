import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function useMentorSessions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["mentor_sessions", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentor_sessions")
        .select("*")
        .or(`mentor_id.eq.${user!.id},mentee_id.eq.${user!.id}`)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateMentorSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (session: {
      mentor_id: string; mentee_id: string; enrolment_id?: string;
      session_type: string; scheduled_at: string; duration_minutes: number;
      location?: string; notes?: string;
    }) => {
      const { data, error } = await supabase.from("mentor_sessions").insert(session).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mentor_sessions"] }); toast.success("Session scheduled"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateMentorSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from("mentor_sessions").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mentor_sessions"] }); toast.success("Session updated"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useMentorGoals() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["mentor_goals", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentor_goals")
        .select("*")
        .or(`mentor_id.eq.${user!.id},mentee_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateMentorGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (goal: {
      mentor_id: string; mentee_id: string; enrolment_id?: string;
      title: string; description?: string; target_date?: string;
    }) => {
      const { data, error } = await supabase.from("mentor_goals").insert(goal).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mentor_goals"] }); toast.success("Goal created"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateMentorGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from("mentor_goals").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mentor_goals"] }); toast.success("Goal updated"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useMentorMessages(recipientId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["mentor_messages", user?.id, recipientId],
    enabled: !!user?.id,
    queryFn: async () => {
      let q = supabase.from("mentor_messages").select("*").order("created_at", { ascending: true });
      if (recipientId) {
        q = q.or(`and(sender_id.eq.${user!.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user!.id})`);
      } else {
        q = q.or(`sender_id.eq.${user!.id},recipient_id.eq.${user!.id}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useSendMentorMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (msg: { sender_id: string; recipient_id: string; enrolment_id?: string; body: string }) => {
      const { error } = await supabase.from("mentor_messages").insert(msg);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mentor_messages"] }); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useWorkplaceEvidence() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["workplace_evidence", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workplace_evidence")
        .select("*")
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useReviewEvidence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, review_notes, reviewed_by }: {
      id: string; status: string; review_notes?: string; reviewed_by: string;
    }) => {
      const { error } = await supabase.from("workplace_evidence").update({
        status, review_notes, reviewed_by, reviewed_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["workplace_evidence"] }); toast.success("Evidence reviewed"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useAssessorReportsForMentor() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["assessor_reports_mentor", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessor_reports")
        .select("id, programme_name, assessor_name, status, section5_mentor_update, start_date, end_date, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateMentorFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, section5_mentor_update }: { id: string; section5_mentor_update: string }) => {
      const { error } = await supabase.from("assessor_reports").update({ section5_mentor_update }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["assessor_reports_mentor"] }); toast.success("Feedback saved"); },
    onError: (e: any) => toast.error(e.message),
  });
}
