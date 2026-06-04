import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ContentPrerequisite {
  id: string;
  content_block_id: string;
  prerequisite_block_id: string;
  prerequisite_type: string;
  min_score: number | null;
  created_at: string;
}

export interface ModulePrerequisite {
  id: string;
  module_id: string;
  prerequisite_module_id: string;
  created_at: string;
}

/** Fetch content prerequisites for a set of module blocks */
export function useContentPrerequisites(moduleIds: string[]) {
  return useQuery({
    queryKey: ["content_prerequisites", moduleIds],
    enabled: moduleIds.length > 0,
    queryFn: async () => {
      // Get all content_block_ids for these modules first
      const { data: blocks, error: bErr } = await supabase
        .from("content_blocks")
        .select("id")
        .in("module_id", moduleIds);
      if (bErr) throw bErr;
      const blockIds = (blocks as any[]).map((b: any) => b.id);
      if (blockIds.length === 0) return [] as ContentPrerequisite[];

      const { data, error } = await supabase
        .from("content_prerequisites")
        .select("*")
        .in("content_block_id", blockIds);
      if (error) throw error;
      return data as ContentPrerequisite[];
    },
  });
}

/** Fetch module prerequisites for a programme */
export function useModulePrerequisites(programmeId: string | undefined) {
  return useQuery({
    queryKey: ["module_prerequisites", programmeId],
    enabled: !!programmeId,
    queryFn: async () => {
      const { data: modules, error: mErr } = await supabase
        .from("programme_modules")
        .select("id")
        .eq("programme_id", programmeId!);
      if (mErr) throw mErr;
      const moduleIds = (modules as any[]).map((m: any) => m.id);
      if (moduleIds.length === 0) return [] as ModulePrerequisite[];

      const { data, error } = await supabase
        .from("module_prerequisites")
        .select("*")
        .in("module_id", moduleIds);
      if (error) throw error;
      return data as ModulePrerequisite[];
    },
  });
}

/** Add a content prerequisite */
export function useAddContentPrerequisite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { content_block_id: string; prerequisite_block_id: string; prerequisite_type?: string; min_score?: number }) => {
      const { data, error } = await supabase.from("content_prerequisites").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content_prerequisites"] });
      toast.success("Prerequisite added");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

/** Remove a content prerequisite */
export function useRemoveContentPrerequisite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("content_prerequisites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content_prerequisites"] });
      toast.success("Prerequisite removed");
    },
  });
}

/** Add a module prerequisite */
export function useAddModulePrerequisite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { module_id: string; prerequisite_module_id: string }) => {
      const { data, error } = await supabase.from("module_prerequisites").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["module_prerequisites"] });
      toast.success("Module prerequisite added");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

/** Remove a module prerequisite */
export function useRemoveModulePrerequisite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("module_prerequisites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["module_prerequisites"] });
      toast.success("Module prerequisite removed");
    },
  });
}

/**
 * Check if a content block is locked (prerequisites not met)
 */
export function isBlockLocked(
  blockId: string,
  prerequisites: ContentPrerequisite[],
  completedBlockIds: Set<string>
): boolean {
  const prereqs = prerequisites.filter((p) => p.content_block_id === blockId);
  if (prereqs.length === 0) return false;
  return prereqs.some((p) => !completedBlockIds.has(p.prerequisite_block_id));
}

/**
 * Check if a module is locked (module prerequisites not met)
 */
export function isModuleLocked(
  moduleId: string,
  modulePrereqs: ModulePrerequisite[],
  completedModuleIds: Set<string>
): boolean {
  const prereqs = modulePrereqs.filter((p) => p.module_id === moduleId);
  if (prereqs.length === 0) return false;
  return prereqs.some((p) => !completedModuleIds.has(p.prerequisite_module_id));
}
