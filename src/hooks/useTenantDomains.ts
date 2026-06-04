import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const db = supabase as any;

export interface TenantDomain {
  id: string;
  tenant_id: string;
  hostname: string;
  verification_token: string;
  verification_method: "TXT" | "CNAME";
  status: "pending" | "verified" | "failed";
  is_primary: boolean;
  verified_at: string | null;
  last_checked_at: string | null;
  created_at: string;
}

export function useTenantDomains(tenantId?: string) {
  return useQuery({
    queryKey: ["tenant-domains", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await db
        .from("tenant_domains")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TenantDomain[];
    },
  });
}

export function useAddTenantDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { tenant_id: string; hostname: string; method: "TXT" | "CNAME" }) => {
      const { data, error } = await db.rpc("add_tenant_domain", {
        _tenant_id: vars.tenant_id,
        _hostname: vars.hostname,
        _method: vars.method,
      });
      if (error) throw error;
      return data as TenantDomain;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["tenant-domains", v.tenant_id] });
      toast.success("Domain added — add the DNS record then verify");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useVerifyTenantDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { domain_id: string; tenant_id: string }) => {
      const { data, error } = await supabase.functions.invoke("verify-tenant-domain", {
        body: { domain_id: vars.domain_id },
      });
      if (error) throw error;
      return data as { verified: boolean; detail: string };
    },
    onSuccess: (res, v) => {
      qc.invalidateQueries({ queryKey: ["tenant-domains", v.tenant_id] });
      if (res.verified) toast.success("Domain verified ✓");
      else toast.error(`Verification failed: ${res.detail}`);
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useSetPrimaryDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { domain_id: string; tenant_id: string }) => {
      const { error } = await db.rpc("set_primary_tenant_domain", { _domain_id: vars.domain_id });
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["tenant-domains", v.tenant_id] });
      toast.success("Primary domain updated");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useRemoveTenantDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { domain_id: string; tenant_id: string }) => {
      const { error } = await db.rpc("remove_tenant_domain", { _domain_id: vars.domain_id });
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["tenant-domains", v.tenant_id] });
      toast.success("Domain removed");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
