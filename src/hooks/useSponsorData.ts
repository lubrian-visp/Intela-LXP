import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// ─── Sponsor Enrolments (Dashboard) ─────────────────────────────────

export interface SponsorEnrolment {
  id: string;
  learner_id: string;
  sponsor_id: string | null;
  cohort_id: string;
  status: string;
  progress_percentage: number | null;
  enrolled_at: string | null;
  completed_at: string | null;
  programme_title: string;
  programme_type_id: string | null;
  programme_type_name: string | null;
  country_id: string | null;
  country_name: string | null;
  learner_name: string | null;
}

export function useSponsorEnrolments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sponsor_enrolments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Single query with nested joins: enrolments → cohorts → programmes → programme_types, countries
      const { data, error } = await supabase
        .from("enrolments")
        .select(`
          id, learner_id, sponsor_id, cohort_id, status, progress_percentage, enrolled_at, completed_at,
          cohorts!inner(
            programme_id,
            programmes!inner(
              title, programme_type_id, country_id,
              programme_types(name),
              countries(id, name)
            )
          )
        `)
        .eq("sponsor_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Flatten the nested joins into a clean structure
      return (data ?? []).map((e: any) => {
        const prog = e.cohorts?.programmes;
        return {
          id: e.id,
          learner_id: e.learner_id,
          sponsor_id: e.sponsor_id,
          cohort_id: e.cohort_id,
          status: e.status,
          progress_percentage: e.progress_percentage,
          enrolled_at: e.enrolled_at,
          completed_at: e.completed_at,
          programme_title: prog?.title ?? "—",
          programme_type_id: prog?.programme_type_id ?? null,
          programme_type_name: prog?.programme_types?.name ?? null,
          country_id: prog?.countries?.id ?? null,
          country_name: prog?.countries?.name ?? null,
          learner_name: null, // profiles join can be added later
        } as SponsorEnrolment;
      });
    },
  });
}

// ─── Invoices ────────────────────────────────────────────────────────

export function useSponsorInvoices() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sponsor_invoices", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sponsor_invoices" as any)
        .select("*, programmes(title), cohorts(name), countries(name, iso_code, currency_code), programme_types(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: any) => {
      const { data, error } = await supabase
        .from("sponsor_invoices" as any)
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sponsor_invoices"] }),
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from("sponsor_invoices" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sponsor_invoices"] }),
  });
}

// ─── Messages ────────────────────────────────────────────────────────

export function useSponsorMessages() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sponsor_messages", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sponsor_messages" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: any) => {
      const { data, error } = await supabase
        .from("sponsor_messages" as any)
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sponsor_messages"] }),
  });
}

export function useMarkMessageRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sponsor_messages" as any)
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sponsor_messages"] }),
  });
}

// ─── Sponsor Notifications (filtered from main notifications) ──────

export function useSponsorNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sponsor_notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}
