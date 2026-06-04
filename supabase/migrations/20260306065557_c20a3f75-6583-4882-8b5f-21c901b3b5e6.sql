
-- ============================================
-- PAYMENT GATEWAY DYNAMIC SCHEMA
-- ============================================

-- 1. Payment gateways configuration
CREATE TABLE public.payment_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_key text NOT NULL UNIQUE,
  name text NOT NULL,
  tagline text,
  region text,
  status text NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error')),
  is_primary boolean NOT NULL DEFAULT false,
  test_mode boolean NOT NULL DEFAULT true,
  methods text[] DEFAULT '{}',
  currencies text[] DEFAULT '{}',
  config jsonb DEFAULT '{}'::jsonb,
  webhook_url text,
  webhook_secret_key_name text,
  public_key_name text,
  secret_key_name text,
  branding_color text,
  created_by uuid,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Payment routing rules
CREATE TABLE public.payment_routing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency text NOT NULL,
  primary_gateway_id uuid NOT NULL REFERENCES public.payment_gateways(id) ON DELETE CASCADE,
  fallback_gateway_id uuid REFERENCES public.payment_gateways(id) ON DELETE SET NULL,
  reason text,
  min_amount numeric,
  max_amount numeric,
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Payment webhook logs
CREATE TABLE public.payment_webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_id uuid NOT NULL REFERENCES public.payment_gateways(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'success', 'failed', 'retry')),
  reference text,
  payload jsonb DEFAULT '{}'::jsonb,
  response_code integer,
  error_message text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Payment transactions
CREATE TABLE public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_id uuid NOT NULL REFERENCES public.payment_gateways(id) ON DELETE CASCADE,
  external_ref text,
  amount numeric NOT NULL,
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'successful', 'failed', 'refunded', 'cancelled')),
  payment_method text,
  customer_email text,
  customer_name text,
  metadata jsonb DEFAULT '{}'::jsonb,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  user_id uuid,
  enrolment_id uuid REFERENCES public.enrolments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- payment_gateways: admin-only management, all authenticated can read
CREATE POLICY "Admins manage gateways" ON public.payment_gateways
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Authenticated users read gateways" ON public.payment_gateways
  FOR SELECT TO authenticated
  USING (true);

-- payment_routing_rules: admin-only
CREATE POLICY "Admins manage routing rules" ON public.payment_routing_rules
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Authenticated users read routing rules" ON public.payment_routing_rules
  FOR SELECT TO authenticated
  USING (true);

-- payment_webhook_logs: admin-only
CREATE POLICY "Admins manage webhook logs" ON public.payment_webhook_logs
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- payment_transactions: admin can see all, users see their own
CREATE POLICY "Admins manage transactions" ON public.payment_transactions
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Users see own transactions" ON public.payment_transactions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- INDEXES & TRIGGERS
-- ============================================
CREATE INDEX idx_payment_gateways_key ON public.payment_gateways(gateway_key);
CREATE INDEX idx_payment_gateways_tenant ON public.payment_gateways(tenant_id);
CREATE INDEX idx_routing_rules_currency ON public.payment_routing_rules(currency);
CREATE INDEX idx_webhook_logs_gateway ON public.payment_webhook_logs(gateway_id);
CREATE INDEX idx_transactions_gateway ON public.payment_transactions(gateway_id);
CREATE INDEX idx_transactions_user ON public.payment_transactions(user_id);
CREATE INDEX idx_transactions_tenant ON public.payment_transactions(tenant_id);

CREATE TRIGGER update_payment_gateways_updated_at
  BEFORE UPDATE ON public.payment_gateways
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_routing_rules_updated_at
  BEFORE UPDATE ON public.payment_routing_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
