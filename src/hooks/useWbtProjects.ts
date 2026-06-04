import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const db = supabase as any;

export interface WbtProject {
  id: string;
  programme_id: string | null;
  title: string;
  description: string | null;
  required_skills: string[];
  agile_framework: string;
  sprint_length_weeks: number;
  project_model: string;
  payment_model: string;
  budget: number;
  currency: string;
  status: string;
  created_by: string;
  mentor_id: string | null;
  client_id: string | null;
  max_learners: number;
  start_date: string | null;
  end_date: string | null;
  config_json: any;
  updated_at: string;
  created_at: string;
}

export function useWbtProjects(status?: string) {
  return useQuery({
    queryKey: ["wbt-projects", status],
    queryFn: async () => {
      let q = db.from("wbt_projects").select("*").order("created_at", { ascending: false });
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return data as WbtProject[];
    },
  });
}

export function useWbtProject(id: string | undefined) {
  return useQuery({
    queryKey: ["wbt-project", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await db.from("wbt_projects").select("*").eq("id", id).single();
      if (error) throw error;
      return data as WbtProject;
    },
  });
}

export function useCreateWbtProject() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (project: Partial<WbtProject>) => {
      const { data, error } = await db.from("wbt_projects").insert({ ...project, created_by: user?.id }).select().single();
      if (error) throw error;
      return data as WbtProject;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wbt-projects"] });
      toast({ title: "Project created" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to create project", description: err.message, variant: "destructive" });
    },
  });
}

export function useUpdateWbtProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WbtProject> & { id: string }) => {
      const { data, error } = await db.from("wbt_projects").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data as WbtProject;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["wbt-projects"] });
      qc.invalidateQueries({ queryKey: ["wbt-project", data.id] });
      toast({ title: "Project updated" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update project", description: err.message, variant: "destructive" });
    },
  });
}

export function useWbtProjectApplications(projectId: string | undefined) {
  return useQuery({
    queryKey: ["wbt-applications", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await db.from("wbt_project_applications").select("*").eq("project_id", projectId).order("created_at");
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useApplyToWbtProject() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ projectId, coverNote }: { projectId: string; coverNote?: string }) => {
      const { error } = await db.from("wbt_project_applications").insert({
        project_id: projectId,
        learner_id: user?.id,
        cover_note: coverNote,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wbt-applications"] });
      toast({ title: "Application submitted" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to apply", description: err.message, variant: "destructive" });
    },
  });
}
