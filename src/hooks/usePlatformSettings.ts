import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const db = supabase as any;

export interface FeatureFlag {
  id: string;
  flag_key: string;
  is_enabled: boolean;
  description: string | null;
  updated_at: string;
}

export interface PlatformSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  category: string;
  label: string;
  description: string | null;
  setting_type: string;
  is_editable: boolean;
}

export function useFeatureFlags(prefix?: string) {
  return useQuery({
    queryKey: ["feature-flags", prefix],
    queryFn: async () => {
      let q = db.from("feature_flags").select("*").order("flag_key");
      if (prefix) q = q.like("flag_key", `${prefix}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data as FeatureFlag[];
    },
  });
}

export function useToggleFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { error } = await db
        .from("feature_flags")
        .update({ is_enabled, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feature-flags"] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update", description: err.message, variant: "destructive" });
    },
  });
}

export function usePlatformSettings(category?: string) {
  const qc = useQueryClient();
  const uid = useId();

  // Each hook instance uses a unique channel name so that one component
  // unmounting does not remove the shared channel and break other subscribers.
  useEffect(() => {
    const channel = supabase
      .channel(`platform_settings_changes_${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "platform_settings" },
        () => {
          qc.invalidateQueries({ queryKey: ["platform-settings"] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [qc, uid]);

  return useQuery({
    queryKey: ["platform-settings", category],
    queryFn: async () => {
      let q = db.from("platform_settings").select("*").order("setting_key");
      if (category) q = q.eq("category", category);
      const { data, error } = await q;
      if (error) throw error;
      return data as PlatformSetting[];
    },
    staleTime: 30_000,
  });
}

export function useUpdatePlatformSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, setting_value }: { id: string; setting_value: string }) => {
      const { error } = await db
        .from("platform_settings")
        .update({ setting_value })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-settings"] });
      toast({ title: "Setting updated" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update", description: err.message, variant: "destructive" });
    },
  });
}
