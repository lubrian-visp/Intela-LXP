import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  status: string;
  settings: Record<string, any>;
  max_users: number | null;
  max_programmes: number | null;
  subscription_tier: string | null;
  contact_email: string | null;
  country: string | null;
  created_at: string;
}

export interface TenantMembership {
  tenant_id: string;
  role: string;
  tenant: Tenant;
}

interface TenantContextType {
  currentTenant: Tenant | null;
  tenants: TenantMembership[];
  loading: boolean;
  switchTenant: (tenantId: string) => void;
  isPlatformAdmin: boolean;
  tenantId: string | null;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

/**
 * Resolves tenant from: 1) subdomain, 2) user mapping, 3) localStorage
 */
function resolveSubdomainSlug(): string | null {
  const hostname = window.location.hostname;
  // Match pattern: {slug}.domain.com (skip localhost, preview URLs)
  const parts = hostname.split(".");
  if (parts.length >= 3 && !hostname.includes("localhost") && !hostname.includes("lovable.app")) {
    return parts[0];
  }
  return null;
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user, roles } = useAuth();
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [tenants, setTenants] = useState<TenantMembership[]>([]);
  const [loading, setLoading] = useState(true);

  const isPlatformAdmin = roles.includes("super_admin") || roles.includes("systems_admin");

  const fetchUserTenants = useCallback(async (userId: string) => {
    const db = supabase as any;
    const { data, error } = await db
      .from("tenant_users")
      .select("tenant_id, role, tenants:tenant_id(id, name, slug, domain, logo_url, favicon_url, primary_color, secondary_color, status, settings, country, created_at)")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (error || !data) {
      setTenants([]);
      return [];
    }

    const memberships: TenantMembership[] = data
      .filter((d: any) => d.tenants)
      .map((d: any) => ({
        tenant_id: d.tenant_id,
        role: d.role,
        tenant: d.tenants as Tenant,
      }));

    setTenants(memberships);
    return memberships;
  }, []);

  useEffect(() => {
    if (!user) {
      setCurrentTenant(null);
      setTenants([]);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      const memberships = await fetchUserTenants(user.id);
      const db = supabase as any;

      // 1a. Try full-hostname custom-domain mapping (works for any domain user mapped)
      const hostname = window.location.hostname;
      if (hostname && !hostname.includes("localhost") && !hostname.includes("lovable.app")) {
        const { data: byHost } = await db.rpc("resolve_tenant_by_hostname", { _hostname: hostname });
        const resolved = Array.isArray(byHost) ? byHost[0] : byHost;
        if (resolved?.id) {
          const match = memberships.find((m) => m.tenant.id === resolved.id);
          if (match) {
            setCurrentTenant(match.tenant);
            setLoading(false);
            return;
          }
          if (isPlatformAdmin) {
            const { data } = await db.from("tenants").select("*").eq("id", resolved.id).maybeSingle();
            if (data) { setCurrentTenant(data as Tenant); setLoading(false); return; }
          }
        }
      }

      // 1b. Try subdomain slug
      const subSlug = resolveSubdomainSlug();
      if (subSlug) {
        const match = memberships.find((m) => m.tenant.slug === subSlug);
        if (match) {
          setCurrentTenant(match.tenant);
          setLoading(false);
          return;
        }
        if (isPlatformAdmin) {
          const { data } = await db.from("tenants").select("*").eq("slug", subSlug).maybeSingle();
          if (data) {
            setCurrentTenant(data as Tenant);
            setLoading(false);
            return;
          }
        }
      }

      // 2. Try localStorage
      const savedId = localStorage.getItem("active_tenant_id");
      if (savedId) {
        const match = memberships.find((m) => m.tenant.id === savedId);
        if (match) {
          setCurrentTenant(match.tenant);
          setLoading(false);
          return;
        }
      }

      // 3. Default to first tenant
      if (memberships.length > 0) {
        setCurrentTenant(memberships[0].tenant);
        localStorage.setItem("active_tenant_id", memberships[0].tenant.id);
      }

      setLoading(false);
    })();
  }, [user, isPlatformAdmin, fetchUserTenants]);

  const switchTenant = useCallback(async (tenantId: string) => {
    const match = tenants.find((m) => m.tenant.id === tenantId);
    if (match) {
      // Sync server-side session tenant context (RLS uses this)
      const db = supabase as any;
      const { error } = await db.rpc("set_active_tenant", { _tenant_id: tenantId });
      if (error) {
        console.error("Failed to set active tenant:", error);
        return;
      }
      setCurrentTenant(match.tenant);
      localStorage.setItem("active_tenant_id", tenantId);
    }
  }, [tenants]);

  // On initial load, sync the active tenant to the server session
  useEffect(() => {
    if (currentTenant) {
      const db = supabase as any;
      (async () => {
        try {
          await db.rpc("set_active_tenant", { _tenant_id: currentTenant.id });
        } catch {
          /* non-fatal */
        }
      })();
    }
  }, [currentTenant?.id]);

  // Realtime: re-fetch tenant data when the current tenant row is updated
  // (e.g. logo, colours, name changed by an admin) so all users see it live.
  useEffect(() => {
    if (!currentTenant?.id) return;

    const channel = supabase
      .channel(`tenant_update_${currentTenant.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tenants", filter: `id=eq.${currentTenant.id}` },
        (payload) => {
          setCurrentTenant(payload.new as Tenant);
          setTenants((prev) =>
            prev.map((m) =>
              m.tenant.id === currentTenant.id ? { ...m, tenant: payload.new as Tenant } : m
            )
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentTenant?.id]);

  return (
    <TenantContext.Provider value={{
      currentTenant,
      tenants,
      loading,
      switchTenant,
      isPlatformAdmin,
      tenantId: currentTenant?.id ?? null,
    }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within TenantProvider");
  return ctx;
}
