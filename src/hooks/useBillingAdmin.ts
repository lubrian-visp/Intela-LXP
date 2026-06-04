import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BillingTier {
  id: string;
  tier_key: string;
  display_name: string;
  description: string | null;
  is_active: boolean;
  is_public: boolean;
  is_default: boolean;
  trial_days: number;
  sort_order: number;
  limits: Record<string, any>;
}

export interface BillingTierPrice {
  id: string;
  tier_id: string;
  currency: string;
  billing_interval: "monthly" | "annual" | "one_time";
  unit_amount_minor: number;
  is_active: boolean;
  provider_price_refs: Record<string, any>;
}

export interface BillingProvider {
  provider_key: string;
  display_name: string;
  is_enabled: boolean;
  supports_subscriptions: boolean;
  supports_one_time: boolean;
  supported_currencies: string[];
  config: Record<string, any>;
  // Catalog/dynamic-form fields (added by Payment Gateway Catalog migration)
  logo_url?: string | null;
  gateway_type?: "subscription" | "one_off" | "both";
  is_available_to_tenants?: boolean;
  supported_countries?: string[];
  credential_schema?: Array<{ key: string; label: string; type: "text" | "password" | "url"; required?: boolean; help?: string }>;
  setup_instructions?: string | null;
  sort_order?: number;
}

export interface BillingRoutingRule {
  id: string;
  match_country: string | null;
  match_currency: string | null;
  preferred_provider: string;
  priority: number;
  is_active: boolean;
}

// ─── Tiers ───────────────────────────────────────────────
export function useBillingTiers() {
  return useQuery({
    queryKey: ["billing-tiers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_tiers")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as BillingTier[];
    },
  });
}

export function useUpsertBillingTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tier: Partial<BillingTier> & { tier_key: string; display_name: string }) => {
      const { error } = await supabase
        .from("billing_tiers")
        .upsert(tier as any, { onConflict: "tier_key" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing-tiers"] });
      toast.success("Tier saved");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteBillingTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("billing_tiers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing-tiers"] });
      toast.success("Tier deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Prices ──────────────────────────────────────────────
export function useBillingPrices(tierId?: string) {
  return useQuery({
    queryKey: ["billing-prices", tierId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("billing_tier_prices").select("*").order("currency");
      if (tierId) q = q.eq("tier_id", tierId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as BillingTierPrice[];
    },
  });
}

export function useUpsertPrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (price: Partial<BillingTierPrice> & { tier_id: string; currency: string; billing_interval: BillingTierPrice["billing_interval"]; unit_amount_minor: number }) => {
      const { error } = await supabase
        .from("billing_tier_prices")
        .upsert(price as any, { onConflict: "tier_id,currency,billing_interval" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing-prices"] });
      toast.success("Price saved");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeletePrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("billing_tier_prices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["billing-prices"] }),
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Providers ───────────────────────────────────────────
export function useBillingProviders() {
  return useQuery({
    queryKey: ["billing-providers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("billing_providers").select("*").order("provider_key");
      if (error) throw error;
      return (data ?? []) as unknown as BillingProvider[];
    },
  });
}

export function useUpdateProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { provider_key: string } & Partial<BillingProvider>) => {
      const { error } = await supabase.from("billing_providers").update(p as any).eq("provider_key", p.provider_key);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing-providers"] });
      toast.success("Provider updated");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Routing rules ───────────────────────────────────────
export function useRoutingRules() {
  return useQuery({
    queryKey: ["billing-routing"],
    queryFn: async () => {
      const { data, error } = await supabase.from("billing_routing_rules").select("*").order("priority");
      if (error) throw error;
      return (data ?? []) as BillingRoutingRule[];
    },
  });
}

export function useUpsertRoutingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rule: Partial<BillingRoutingRule>) => {
      const { error } = await supabase.from("billing_routing_rules").upsert(rule as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing-routing"] });
      toast.success("Routing rule saved");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteRoutingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("billing_routing_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["billing-routing"] }),
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Invoices (admin) ────────────────────────────────────
export function useAllInvoices() {
  return useQuery({
    queryKey: ["billing-invoices-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_invoices")
        .select("*, tenants(name, slug)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useIssueManualInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { tenant_id: string; currency: string; subtotal_minor: number; tax_minor?: number; due_days?: number; invoice_number?: string; notes?: string }) => {
      const { data, error } = await supabase.rpc("issue_manual_invoice", {
        _tenant_id: args.tenant_id,
        _currency: args.currency,
        _subtotal_minor: args.subtotal_minor,
        _tax_minor: args.tax_minor ?? 0,
        _due_days: args.due_days ?? 30,
        _invoice_number: args.invoice_number ?? null,
        _notes: args.notes ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing-invoices-all"] });
      qc.invalidateQueries({ queryKey: ["billing-invoices-tenant"] });
      toast.success("Invoice issued");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useMarkInvoicePaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { invoice_id: string; payment_reference?: string }) => {
      const { error } = await supabase.rpc("mark_invoice_paid", {
        _invoice_id: args.invoice_id,
        _payment_reference: args.payment_reference ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing-invoices-all"] });
      qc.invalidateQueries({ queryKey: ["billing-invoices-tenant"] });
      toast.success("Marked as paid");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useVoidInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { invoice_id: string; reason?: string }) => {
      const { error } = await supabase.rpc("void_invoice", {
        _invoice_id: args.invoice_id,
        _reason: args.reason ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing-invoices-all"] });
      toast.success("Invoice voided");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Tenant subscription view ────────────────────────────
export function useTenantSubscription(tenantId?: string) {
  return useQuery({
    queryKey: ["tenant-subscription", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_tenant_active_subscription", {
        _tenant_id: tenantId,
      });
      if (error) throw error;
      return (data?.[0] ?? null) as any;
    },
  });
}

export function useTenantInvoices(tenantId?: string) {
  return useQuery({
    queryKey: ["billing-invoices-tenant", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_invoices")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useChangeTenantTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { tenant_id: string; tier_id: string; price_id?: string | null }) => {
      // Cancel any current active subscription
      await supabase
        .from("tenant_subscriptions")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("tenant_id", args.tenant_id)
        .in("status", ["trialling", "active", "past_due", "incomplete"]);

      const { error } = await supabase.from("tenant_subscriptions").insert({
        tenant_id: args.tenant_id,
        tier_id: args.tier_id,
        price_id: args.price_id ?? null,
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-subscription"] });
      qc.invalidateQueries({ queryKey: ["billing-invoices-all"] });
      toast.success("Plan updated");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function formatMinor(minor: number, currency: string) {
  const amount = (minor ?? 0) / 100;
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
