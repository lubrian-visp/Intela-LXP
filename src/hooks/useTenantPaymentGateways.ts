import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CredentialField {
  key: string;
  label: string;
  type: "text" | "password" | "url";
  required?: boolean;
  help?: string;
}

export interface AvailableGateway {
  provider_key: string;
  display_name: string;
  logo_url: string | null;
  gateway_type: "subscription" | "one_off" | "both";
  supported_currencies: string[];
  supported_countries: string[];
  credential_schema: CredentialField[];
  setup_instructions: string | null;
  is_enabled_for_tenant: boolean;
  is_default: boolean;
  mode: "test" | "live";
  verification_status: "unverified" | "verified" | "failed";
  sort_order: number;
}

export interface TenantGatewayRow {
  id: string;
  tenant_id: string;
  provider_key: string;
  is_enabled: boolean;
  is_default: boolean;
  mode: "test" | "live";
  credentials_test: Record<string, string>;
  credentials_live: Record<string, string>;
  display_label: string | null;
  verification_status: "unverified" | "verified" | "failed";
  last_verified_at: string | null;
}

// Catalog of gateways available to this tenant (filtered by what super-admin has enabled)
export function useAvailableGateways(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["available-gateways", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_available_gateways_for_tenant", {
        _tenant_id: tenantId!,
      });
      if (error) throw error;
      return (data ?? []) as unknown as AvailableGateway[];
    },
  });
}

// Full row (including credentials) for a tenant + provider
export function useTenantGatewayRow(tenantId: string | undefined, providerKey: string | undefined) {
  return useQuery({
    queryKey: ["tenant-gateway-row", tenantId, providerKey],
    enabled: !!tenantId && !!providerKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_payment_gateways")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("provider_key", providerKey!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as TenantGatewayRow | null;
    },
  });
}

export interface UpsertGatewayInput {
  tenant_id: string;
  provider_key: string;
  is_enabled?: boolean;
  is_default?: boolean;
  mode?: "test" | "live";
  credentials_test?: Record<string, string>;
  credentials_live?: Record<string, string>;
  display_label?: string | null;
}

export function useUpsertTenantGateway() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpsertGatewayInput) => {
      const { data, error } = await supabase
        .from("tenant_payment_gateways")
        .upsert(input as any, { onConflict: "tenant_id,provider_key" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["available-gateways", vars.tenant_id] });
      qc.invalidateQueries({ queryKey: ["tenant-gateway-row", vars.tenant_id, vars.provider_key] });
      toast.success("Payment gateway updated");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to update gateway"),
  });
}

export function useDeleteTenantGateway() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenant_id, provider_key }: { tenant_id: string; provider_key: string }) => {
      const { error } = await supabase
        .from("tenant_payment_gateways")
        .delete()
        .eq("tenant_id", tenant_id)
        .eq("provider_key", provider_key);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["available-gateways", vars.tenant_id] });
      qc.invalidateQueries({ queryKey: ["tenant-gateway-row", vars.tenant_id, vars.provider_key] });
      toast.success("Gateway disconnected");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to disconnect gateway"),
  });
}
