import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const db = supabase as any;

export interface PaymentGateway {
  id: string;
  gateway_key: string;
  name: string;
  tagline: string | null;
  region: string | null;
  status: string;
  is_primary: boolean;
  test_mode: boolean;
  methods: string[];
  currencies: string[];
  config: Record<string, any>;
  webhook_url: string | null;
  branding_color: string | null;
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRoutingRule {
  id: string;
  currency: string;
  primary_gateway_id: string;
  fallback_gateway_id: string | null;
  reason: string | null;
  min_amount: number | null;
  max_amount: number | null;
  is_active: boolean;
  priority: number;
  primary_gateway?: PaymentGateway;
  fallback_gateway?: PaymentGateway;
}

export interface PaymentWebhookLog {
  id: string;
  gateway_id: string;
  event_type: string;
  status: string;
  reference: string | null;
  payload: Record<string, any>;
  response_code: number | null;
  error_message: string | null;
  processed_at: string | null;
  created_at: string;
  payment_gateways?: PaymentGateway;
}

export interface PaymentTransaction {
  id: string;
  gateway_id: string;
  external_ref: string | null;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  customer_email: string | null;
  customer_name: string | null;
  created_at: string;
}

// ─── GATEWAYS ───
export function usePaymentGateways() {
  return useQuery({
    queryKey: ["payment-gateways"],
    queryFn: async () => {
      const { data, error } = await db.from("payment_gateways").select("*").order("is_primary", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PaymentGateway[];
    },
  });
}

export function useCreatePaymentGateway() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (values: Partial<PaymentGateway>) => {
      const { data, error } = await db.from("payment_gateways").insert({ ...values, created_by: user?.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payment-gateways"] }); toast.success("Gateway created"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdatePaymentGateway() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<PaymentGateway> & { id: string }) => {
      const { error } = await db.from("payment_gateways").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payment-gateways"] }); toast.success("Gateway updated"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeletePaymentGateway() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("payment_gateways").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payment-gateways"] }); toast.success("Gateway deleted"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useSetPrimaryGateway() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Unset all primaries first
      await db.from("payment_gateways").update({ is_primary: false }).neq("id", id);
      const { error } = await db.from("payment_gateways").update({ is_primary: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payment-gateways"] }); toast.success("Primary gateway updated"); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── ROUTING RULES ───
export function usePaymentRoutingRules() {
  return useQuery({
    queryKey: ["payment-routing-rules"],
    queryFn: async () => {
      const { data, error } = await db
        .from("payment_routing_rules")
        .select("*, primary_gateway:primary_gateway_id(id, name, gateway_key), fallback_gateway:fallback_gateway_id(id, name, gateway_key)")
        .order("priority");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useCreateRoutingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<PaymentRoutingRule>) => {
      const { error } = await db.from("payment_routing_rules").insert(values);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payment-routing-rules"] }); toast.success("Routing rule created"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteRoutingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("payment_routing_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payment-routing-rules"] }); toast.success("Rule deleted"); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── WEBHOOK LOGS ───
export function usePaymentWebhookLogs(limit = 20) {
  return useQuery({
    queryKey: ["payment-webhook-logs", limit],
    queryFn: async () => {
      const { data, error } = await db
        .from("payment_webhook_logs")
        .select("*, payment_gateways:gateway_id(name, gateway_key)")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

// ─── TRANSACTIONS ───
export function usePaymentTransactions(limit = 50) {
  return useQuery({
    queryKey: ["payment-transactions", limit],
    queryFn: async () => {
      const { data, error } = await db
        .from("payment_transactions")
        .select("*, payment_gateways:gateway_id(name, gateway_key)")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

// ─── STATS ───
export function usePaymentStats() {
  return useQuery({
    queryKey: ["payment-stats"],
    queryFn: async () => {
      const [txRes, successRes] = await Promise.all([
        db.from("payment_transactions").select("id", { count: "exact", head: true }),
        db.from("payment_transactions").select("id", { count: "exact", head: true }).eq("status", "successful"),
      ]);
      const total = txRes.count ?? 0;
      const successful = successRes.count ?? 0;
      return {
        totalTransactions: total,
        successRate: total > 0 ? Math.round((successful / total) * 1000) / 10 : 0,
      };
    },
  });
}
