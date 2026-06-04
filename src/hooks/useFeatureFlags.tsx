import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";
import { ReactNode } from "react";

const db = supabase as any;

export interface EffectiveFlag {
  flag_key: string;
  display_name: string;
  description: string | null;
  category: string;
  min_tier: string;
  sort_order: number;
  is_enabled: boolean;
  has_override: boolean;
}

export interface QuotaUsage {
  max_users: number | null;
  active_users: number;
  max_programmes: number | null;
  current_programmes: number;
}

/** Returns the catalog + override merged map of flags for a given tenant */
export function useTenantEffectiveFlags(tenantId: string | null) {
  return useQuery({
    queryKey: ["tenant-effective-flags", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await db.rpc("get_tenant_effective_flags", { _tenant_id: tenantId });
      if (error) throw error;
      return (data ?? []) as EffectiveFlag[];
    },
  });
}

/** Quota usage (current vs max) for a tenant */
export function useTenantQuotaUsage(tenantId: string | null) {
  return useQuery({
    queryKey: ["tenant-quota-usage", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await db.rpc("get_tenant_quota_usage", { _tenant_id: tenantId });
      if (error) throw error;
      return (data?.[0] ?? null) as QuotaUsage | null;
    },
  });
}

/** Toggle a flag (upsert override) — tenant admins / platform admins only */
export function useToggleTenantFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenant_id, flag_key, is_enabled }: { tenant_id: string; flag_key: string; is_enabled: boolean }) => {
      const { error } = await db
        .from("tenant_feature_flags")
        .upsert({ tenant_id, flag_key, is_enabled }, { onConflict: "tenant_id,flag_key" });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["tenant-effective-flags", vars.tenant_id] });
      qc.invalidateQueries({ queryKey: ["feature-flag-map"] });
      toast.success("Feature flag updated");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

/** Lightweight map of { flag_key: is_enabled } for the *current* tenant — used by gates */
export function useFeatureFlagMap() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["feature-flag-map", tenantId],
    enabled: !!tenantId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await db.rpc("get_tenant_effective_flags", { _tenant_id: tenantId });
      if (error) throw error;
      const map: Record<string, boolean> = {};
      (data ?? []).forEach((r: EffectiveFlag) => { map[r.flag_key] = r.is_enabled; });
      return map;
    },
  });
}

/** Hook: is the given flag enabled for the current tenant? Fail-open if unknown. */
export function useFeatureFlag(flagKey: string): boolean {
  const { data: map } = useFeatureFlagMap();
  if (!map) return true;
  return map[flagKey] ?? true;
}

/** Conditional render gate based on a feature flag */
export function FeatureGate({ flag, fallback = null, children }: { flag: string; fallback?: ReactNode; children: ReactNode }) {
  const enabled = useFeatureFlag(flag);
  if (!enabled) return <>{fallback}</>;
  return <>{children}</>;
}
