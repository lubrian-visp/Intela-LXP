import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const db = supabase as any;

export interface WbtBacklogItem {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  acceptance_criteria: string | null;
  story_points: number | null;
  priority: number;
  status: string;
  created_by: string;
  approved_by: string | null;
  sprint_id: string | null;
  sequence_order: number;
  updated_at: string;
  created_at: string;
}

export interface WbtSprint {
  id: string;
  project_id: string;
  sprint_number: number;
  title: string | null;
  goal: string | null;
  start_date: string;
  end_date: string;
  status: string;
  review_status: string;
  updated_at: string;
}

export function useWbtBacklog(projectId: string | undefined) {
  return useQuery({
    queryKey: ["wbt-backlog", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await db.from("wbt_backlog_items").select("*").eq("project_id", projectId).order("priority", { ascending: false }).order("sequence_order");
      if (error) throw error;
      return data as WbtBacklogItem[];
    },
  });
}

export function useCreateBacklogItem() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (item: Partial<WbtBacklogItem>) => {
      const { data, error } = await db.from("wbt_backlog_items").insert({ ...item, created_by: user?.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wbt-backlog"] });
      toast({ title: "Story added to backlog" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to add story", description: err.message, variant: "destructive" });
    },
  });
}

export function useUpdateBacklogItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WbtBacklogItem> & { id: string }) => {
      const { error } = await db.from("wbt_backlog_items").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wbt-backlog"] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update story", description: err.message, variant: "destructive" });
    },
  });
}

export function useWbtSprints(projectId: string | undefined) {
  return useQuery({
    queryKey: ["wbt-sprints", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await db.from("wbt_sprints").select("*").eq("project_id", projectId).order("sprint_number");
      if (error) throw error;
      return data as WbtSprint[];
    },
  });
}

export function useCreateSprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sprint: Partial<WbtSprint>) => {
      const { data, error } = await db.from("wbt_sprints").insert(sprint).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wbt-sprints"] });
      toast({ title: "Sprint created" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to create sprint", description: err.message, variant: "destructive" });
    },
  });
}
