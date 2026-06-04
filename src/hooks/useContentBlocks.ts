import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export function useContentBlocks(moduleId?: string) {
  return useQuery({
    queryKey: ["content_blocks", moduleId],
    enabled: !!moduleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_blocks")
        .select("*")
        .eq("module_id", moduleId!)
        .order("sequence_order");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateContentBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"content_blocks">) => {
      const { data, error } = await supabase
        .from("content_blocks")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["content_blocks", data.module_id] });
    },
  });
}

export function useUpdateContentBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"content_blocks"> & { id: string }) => {
      const { data, error } = await supabase
        .from("content_blocks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["content_blocks", data.module_id] });
    },
  });
}

export function useDeleteContentBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, moduleId }: { id: string; moduleId: string }) => {
      const { error } = await supabase
        .from("content_blocks")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { moduleId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["content_blocks", data.moduleId] });
    },
  });
}

export function useReorderContentBlocks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (blocks: { id: string; sequence_order: number; module_id: string }[]) => {
      const updates = blocks.map((b) =>
        supabase
          .from("content_blocks")
          .update({ sequence_order: b.sequence_order })
          .eq("id", b.id)
      );
      await Promise.all(updates);
      return blocks[0]?.module_id;
    },
    onSuccess: (moduleId) => {
      if (moduleId) qc.invalidateQueries({ queryKey: ["content_blocks", moduleId] });
    },
  });
}
