import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const db = supabase as any;

export interface AdminTenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  contact_email: string | null;
  status: string;
  subscription_tier: string;
  role: string;
}

/** Tenants where the current user is owner or admin. */
export function useMyAdminTenants() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-admin-tenants", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db
        .from("tenant_users")
        .select("role, tenant:tenant_id(id, name, slug, domain, logo_url, favicon_url, primary_color, secondary_color, contact_email, status, subscription_tier)")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .in("role", ["owner", "admin"]);
      if (error) throw error;
      return (data ?? [])
        .filter((r: any) => r.tenant)
        .map((r: any) => ({ ...r.tenant, role: r.role })) as AdminTenant[];
    },
  });
}

export function useUpdateTenantBranding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      tenant_id: string;
      name?: string;
      primary_color?: string;
      secondary_color?: string;
      logo_url?: string;
      favicon_url?: string;
      contact_email?: string;
    }) => {
      const { data, error } = await db.rpc("update_tenant_branding", {
        _tenant_id: vars.tenant_id,
        _name: vars.name ?? null,
        _primary_color: vars.primary_color ?? null,
        _secondary_color: vars.secondary_color ?? null,
        _logo_url: vars.logo_url ?? null,
        _favicon_url: vars.favicon_url ?? null,
        _contact_email: vars.contact_email ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["my-admin-tenants"] });
      qc.invalidateQueries({ queryKey: ["tenants"] });
      qc.invalidateQueries({ queryKey: ["tenant", vars.tenant_id] });
      toast.success("Branding updated");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useSetTenantMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { tenant_id: string; user_id: string; role: string; is_active?: boolean }) => {
      const { error } = await db.rpc("set_tenant_member_role", {
        _tenant_id: vars.tenant_id,
        _user_id: vars.user_id,
        _role: vars.role,
        _is_active: vars.is_active ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["tenant-users", vars.tenant_id] });
      toast.success("Member updated");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
