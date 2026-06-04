import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useEffect } from "react";

const db = supabase as any;

export interface WbtBoardColumn {
  id: string;
  project_id: string;
  title: string;
  column_key: string;
  sequence_order: number;
  is_mentor_review: boolean;
  is_done: boolean;
  color: string | null;
}

export interface WbtBoardCard {
  id: string;
  project_id: string;
  backlog_item_id: string | null;
  column_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  priority: string;
  sequence_order: number;
  updated_at: string;
}

export function useWbtBoardColumns(projectId: string | undefined) {
  return useQuery({
    queryKey: ["wbt-board-columns", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await db.from("wbt_board_columns").select("*").eq("project_id", projectId).order("sequence_order");
      if (error) throw error;
      return data as WbtBoardColumn[];
    },
  });
}

export function useWbtBoardCards(projectId: string | undefined) {
  const qc = useQueryClient();

  // Real-time subscription for live board updates
  useEffect(() => {
    if (!projectId) return;
    const channel = supabase
      .channel(`wbt-board-${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "wbt_board_cards", filter: `project_id=eq.${projectId}` }, () => {
        qc.invalidateQueries({ queryKey: ["wbt-board-cards", projectId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId, qc]);

  return useQuery({
    queryKey: ["wbt-board-cards", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await db.from("wbt_board_cards").select("*").eq("project_id", projectId).order("sequence_order");
      if (error) throw error;
      return data as WbtBoardCard[];
    },
  });
}

export function useMoveWbtCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ cardId, columnId, sequenceOrder }: { cardId: string; columnId: string; sequenceOrder: number }) => {
      const { error } = await db.from("wbt_board_cards").update({ column_id: columnId, sequence_order: sequenceOrder }).eq("id", cardId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wbt-board-cards"] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to move card", description: err.message, variant: "destructive" });
    },
  });
}

export function useCreateWbtCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (card: Partial<WbtBoardCard>) => {
      const { data, error } = await db.from("wbt_board_cards").insert(card).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wbt-board-cards"] });
      toast({ title: "Card created" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to create card", description: err.message, variant: "destructive" });
    },
  });
}
