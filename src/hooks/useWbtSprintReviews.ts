import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

const db = supabase as any;

export interface WbtSprintReview {
  id: string;
  sprint_id: string;
  project_id: string;
  reviewer_id: string;
  reviewer_role: string;
  decision: string;
  stories_accepted: number;
  stories_rejected: number;
  feedback: string | null;
  reviewed_at: string | null;
  second_reviewer_id: string | null;
  second_review_decision: string | null;
  second_review_notes: string | null;
  second_reviewed_at: string | null;
  payment_release_approved: boolean;
  updated_at: string;
  created_at: string;
}

export interface WbtEscrowTransaction {
  id: string;
  project_id: string;
  sprint_id: string | null;
  transaction_type: string;
  amount: number;
  currency: string;
  platform_fee_percent: number;
  platform_fee_amount: number;
  net_amount: number;
  payer_id: string | null;
  payee_id: string | null;
  status: string;
  payment_gateway: string | null;
  gateway_reference: string | null;
  released_by: string | null;
  released_at: string | null;
  release_reason: string | null;
  second_reviewer_id: string | null;
  second_review_status: string;
  second_review_notes: string | null;
  second_reviewed_at: string | null;
  updated_at: string;
  created_at: string;
}

export function useWbtSprintReviews(projectId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!projectId) return;
    const channel = supabase
      .channel(`wbt-reviews-${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "wbt_sprint_reviews", filter: `project_id=eq.${projectId}` }, () => {
        qc.invalidateQueries({ queryKey: ["wbt-sprint-reviews", projectId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId, qc]);

  return useQuery({
    queryKey: ["wbt-sprint-reviews", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await db.from("wbt_sprint_reviews").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as WbtSprintReview[];
    },
  });
}

export function useCreateSprintReview() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (review: Partial<WbtSprintReview>) => {
      const { data, error } = await db.from("wbt_sprint_reviews").insert({
        ...review,
        reviewer_id: user?.id,
        reviewed_at: new Date().toISOString(),
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wbt-sprint-reviews"] });
      toast({ title: "Sprint review submitted" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to submit review", description: err.message, variant: "destructive" });
    },
  });
}

export function useSecondReviewSprint() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ reviewId, decision, notes }: { reviewId: string; decision: string; notes?: string }) => {
      const { error } = await db.from("wbt_sprint_reviews").update({
        second_reviewer_id: user?.id,
        second_review_decision: decision,
        second_review_notes: notes,
        second_reviewed_at: new Date().toISOString(),
        payment_release_approved: decision === "approved",
      }).eq("id", reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wbt-sprint-reviews"] });
      toast({ title: "Second review submitted" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to submit second review", description: err.message, variant: "destructive" });
    },
  });
}

export function useWbtEscrowTransactions(projectId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!projectId) return;
    const channel = supabase
      .channel(`wbt-escrow-${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "wbt_escrow_transactions", filter: `project_id=eq.${projectId}` }, () => {
        qc.invalidateQueries({ queryKey: ["wbt-escrow", projectId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId, qc]);

  return useQuery({
    queryKey: ["wbt-escrow", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await db.from("wbt_escrow_transactions").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as WbtEscrowTransaction[];
    },
  });
}

export function useCreateEscrowTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tx: Partial<WbtEscrowTransaction>) => {
      const { data, error } = await db.from("wbt_escrow_transactions").insert(tx).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wbt-escrow"] });
      toast({ title: "Escrow transaction created" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to create transaction", description: err.message, variant: "destructive" });
    },
  });
}

export function useReleaseEscrow() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ transactionId, reason }: { transactionId: string; reason?: string }) => {
      const { error } = await db.from("wbt_escrow_transactions").update({
        status: "released",
        released_by: user?.id,
        released_at: new Date().toISOString(),
        release_reason: reason,
      }).eq("id", transactionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wbt-escrow"] });
      toast({ title: "Payment released" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to release payment", description: err.message, variant: "destructive" });
    },
  });
}
