import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const db = supabase as any;

export interface SharedContentItem {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  content: Record<string, any>;
  version: number;
  status: string;
  tags: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SharedContentVersion {
  id: string;
  item_id: string;
  version_number: number;
  content: Record<string, any>;
  change_reason: string | null;
  changed_by: string | null;
  created_at: string;
}

export interface CourseContentLink {
  id: string;
  shared_item_id: string;
  programme_id: string | null;
  module_id: string | null;
  lesson_id: string | null;
  position: number;
  custom_settings: Record<string, any>;
  pinned_version: number | null;
  created_at: string;
  shared_content_items?: SharedContentItem;
}

export function useSharedContentItems(statusFilter?: string) {
  return useQuery({
    queryKey: ["shared-content-items", statusFilter],
    queryFn: async () => {
      let q = db.from("shared_content_items").select("*").order("updated_at", { ascending: false });
      if (statusFilter && statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SharedContentItem[];
    },
  });
}

export function useSharedContentVersions(itemId: string | null) {
  return useQuery({
    queryKey: ["shared-content-versions", itemId],
    enabled: !!itemId,
    queryFn: async () => {
      const { data, error } = await db
        .from("shared_content_versions")
        .select("*")
        .eq("item_id", itemId)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SharedContentVersion[];
    },
  });
}

export function useCourseContentLinks(programmeId?: string, moduleId?: string) {
  return useQuery({
    queryKey: ["course-content-links", programmeId, moduleId],
    queryFn: async () => {
      let q = db.from("course_content_links").select("*, shared_content_items(*)").order("position");
      if (programmeId) q = q.eq("programme_id", programmeId);
      if (moduleId) q = q.eq("module_id", moduleId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CourseContentLink[];
    },
  });
}

export function useCreateSharedContent() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (values: Partial<SharedContentItem>) => {
      const { data, error } = await db
        .from("shared_content_items")
        .insert({ ...values, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shared-content-items"] });
      toast.success("Shared content created");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateSharedContent() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<SharedContentItem> & { id: string }) => {
      // Get current version for snapshot
      const { data: current } = await db.from("shared_content_items").select("*").eq("id", id).single();
      if (current) {
        await db.from("shared_content_versions").insert({
          item_id: id,
          version_number: current.version,
          content: current.content,
          change_reason: "Auto-snapshot before update",
          changed_by: user?.id,
        });
      }
      const { error } = await db
        .from("shared_content_items")
        .update({ ...values, version: (current?.version || 0) + 1 })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shared-content-items"] });
      qc.invalidateQueries({ queryKey: ["shared-content-versions"] });
      toast.success("Shared content updated");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteSharedContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("shared_content_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shared-content-items"] });
      toast.success("Shared content deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useLinkSharedContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<CourseContentLink>) => {
      const { error } = await db.from("course_content_links").insert(values);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course-content-links"] });
      toast.success("Content linked to course");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUnlinkSharedContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("course_content_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course-content-links"] });
      toast.success("Content unlinked");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useSharedContentUsage(itemId: string | null) {
  return useQuery({
    queryKey: ["shared-content-usage", itemId],
    enabled: !!itemId,
    queryFn: async () => {
      const { data, error } = await db
        .from("course_content_links")
        .select("*, programmes:programme_id(id, title)")
        .eq("shared_item_id", itemId);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}
