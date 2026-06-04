import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
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

  // Realtime subscription — any INSERT/UPDATE/DELETE on platform_settings
  // immediately invalidates the cache so all mounted consumers see the change
  // without needing a page refresh.
  useEffect(() => {
    const channel = supabase
      .channel("platform_settings_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "platform_settings" },
        () => {
          qc.invalidateQueries({ queryKey: ["platform-settings"] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  return useQuery({
    queryKey: ["platform-settings", category],
    queryFn: async () => {
      let q = db.from("platform_settings").select("*").order("setting_key");
      if (category) q = q.eq("category", category);
      const { data, error } = await q;
      if (error) throw error;
      return data as PlatformSetting[];
    },
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
