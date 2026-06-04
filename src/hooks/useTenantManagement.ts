import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const db = supabase as any;

export interface TenantRow {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  status: string;
  settings: Record<string, any>;
  max_users: number | null;
  max_programmes: number | null;
  subscription_tier: string;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
}

export function useTenants() {
  return useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const { data, error } = await db.from("tenants").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TenantRow[];
    },
  });
}

export function useTenantUsers(tenantId: string | null) {
  return useQuery({
    queryKey: ["tenant-users", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await db
        .from("tenant_users")
        .select("*, profiles:user_id(full_name, avatar_url)")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTenantFeatureFlags(tenantId: string | null) {
  return useQuery({
    queryKey: ["tenant-feature-flags", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await db
        .from("tenant_feature_flags")
        .select("*")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateTenant() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (values: { name: string; slug: string; domain?: string; contact_email?: string; country?: string; subscription_tier?: string }) => {
      const { data, error } = await db.from("tenants").insert({
        ...values,
        created_by: user?.id,
      }).select().single();
      if (error) throw error;
      // Auto-add creator as owner
      if (data && user) {
        await db.from("tenant_users").insert({
          tenant_id: data.id,
          user_id: user.id,
          role: "owner",
        });
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Tenant created successfully");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<TenantRow> & { id: string }) => {
      const { error } = await db.from("tenants").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Tenant updated");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("tenants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Tenant deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useAddTenantUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenant_id, user_id, role }: { tenant_id: string; user_id: string; role: string }) => {
      const { error } = await db.from("tenant_users").upsert(
        { tenant_id, user_id, role },
        { onConflict: "tenant_id,user_id" }
      );
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["tenant-users", vars.tenant_id] });
      toast.success("User added to tenant");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useRemoveTenantUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenant_id, user_id }: { tenant_id: string; user_id: string }) => {
      const { error } = await db.from("tenant_users").delete()
        .eq("tenant_id", tenant_id).eq("user_id", user_id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["tenant-users", vars.tenant_id] });
      toast.success("User removed from tenant");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
