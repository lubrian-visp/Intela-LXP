
-- =====================================================================
-- PHASE 7: DYNAMIC BILLING FOUNDATION
-- =====================================================================

DO $$ BEGIN
  CREATE TYPE public.billing_interval AS ENUM ('monthly', 'annual', 'one_time');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.subscription_status AS ENUM ('trialling','active','past_due','cancelled','suspended','incomplete');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.invoice_status AS ENUM ('draft','open','paid','past_due','void','refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_attempt_status AS ENUM ('pending','succeeded','failed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1. PROVIDERS
CREATE TABLE IF NOT EXISTS public.billing_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  supported_currencies text[] NOT NULL DEFAULT '{}',
  supported_countries text[] NOT NULL DEFAULT '{}',
  supports_subscriptions boolean NOT NULL DEFAULT true,
  supports_one_time boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.billing_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "providers_public_read" ON public.billing_providers FOR SELECT USING (true);
CREATE POLICY "providers_admin_write" ON public.billing_providers FOR ALL
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));
CREATE TRIGGER trg_providers_updated BEFORE UPDATE ON public.billing_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. TIERS
CREATE TABLE IF NOT EXISTS public.billing_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  is_public boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  trial_days int NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 100,
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.billing_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tiers_public_read" ON public.billing_tiers
  FOR SELECT USING (is_active = true OR public.is_platform_admin(auth.uid()));
CREATE POLICY "tiers_admin_write" ON public.billing_tiers FOR ALL
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));
CREATE TRIGGER trg_tiers_updated BEFORE UPDATE ON public.billing_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE UNIQUE INDEX IF NOT EXISTS uniq_billing_tiers_default
  ON public.billing_tiers ((is_default)) WHERE is_default = true;

-- 3. TIER PRICES
CREATE TABLE IF NOT EXISTS public.billing_tier_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id uuid NOT NULL REFERENCES public.billing_tiers(id) ON DELETE CASCADE,
  currency text NOT NULL,
  billing_interval public.billing_interval NOT NULL,
  unit_amount_minor bigint NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  provider_price_refs jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tier_id, currency, billing_interval)
);
ALTER TABLE public.billing_tier_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prices_public_read" ON public.billing_tier_prices
  FOR SELECT USING (is_active = true OR public.is_platform_admin(auth.uid()));
CREATE POLICY "prices_admin_write" ON public.billing_tier_prices FOR ALL
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));
CREATE TRIGGER trg_prices_updated BEFORE UPDATE ON public.billing_tier_prices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. OVERAGE RATES
CREATE TABLE IF NOT EXISTS public.billing_overage_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id uuid NOT NULL REFERENCES public.billing_tiers(id) ON DELETE CASCADE,
  meter_key text NOT NULL,
  currency text NOT NULL,
  unit_amount_minor bigint NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tier_id, meter_key, currency)
);
ALTER TABLE public.billing_overage_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "overage_public_read" ON public.billing_overage_rates FOR SELECT USING (true);
CREATE POLICY "overage_admin_write" ON public.billing_overage_rates FOR ALL
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));
CREATE TRIGGER trg_overage_updated BEFORE UPDATE ON public.billing_overage_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. ROUTING RULES
CREATE TABLE IF NOT EXISTS public.billing_routing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_country text,
  match_currency text,
  preferred_provider text NOT NULL REFERENCES public.billing_providers(provider_key) ON DELETE CASCADE,
  priority int NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.billing_routing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rules_public_read" ON public.billing_routing_rules FOR SELECT USING (true);
CREATE POLICY "rules_admin_write" ON public.billing_routing_rules FOR ALL
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));
CREATE TRIGGER trg_rules_updated BEFORE UPDATE ON public.billing_routing_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_routing_rules_lookup
  ON public.billing_routing_rules (match_country, match_currency, priority) WHERE is_active = true;

-- 6. TENANT SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.tenant_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tier_id uuid NOT NULL REFERENCES public.billing_tiers(id) ON DELETE RESTRICT,
  price_id uuid REFERENCES public.billing_tier_prices(id) ON DELETE SET NULL,
  provider_key text REFERENCES public.billing_providers(provider_key) ON DELETE SET NULL,
  status public.subscription_status NOT NULL DEFAULT 'trialling',
  currency text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  cancelled_at timestamptz,
  provider_customer_id text,
  provider_subscription_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_subscription_per_tenant
  ON public.tenant_subscriptions (tenant_id)
  WHERE status IN ('trialling','active','past_due','incomplete');
CREATE INDEX IF NOT EXISTS idx_tenant_subs_tenant ON public.tenant_subscriptions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_subs_provider_sub ON public.tenant_subscriptions (provider_key, provider_subscription_id);
ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subs_admin_all" ON public.tenant_subscriptions FOR ALL
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));
CREATE POLICY "subs_tenant_read" ON public.tenant_subscriptions
  FOR SELECT USING (public.is_tenant_owner_or_admin(tenant_id, auth.uid()));
CREATE TRIGGER trg_subs_updated BEFORE UPDATE ON public.tenant_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_subs_audit AFTER INSERT OR UPDATE OR DELETE ON public.tenant_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.log_tenant_event();

-- 7. USAGE EVENTS
CREATE TABLE IF NOT EXISTS public.billing_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.tenant_subscriptions(id) ON DELETE SET NULL,
  meter_key text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_usage_tenant_meter
  ON public.billing_usage_events (tenant_id, meter_key, occurred_at DESC);
ALTER TABLE public.billing_usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usage_admin_all" ON public.billing_usage_events FOR ALL
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));
CREATE POLICY "usage_tenant_read" ON public.billing_usage_events
  FOR SELECT USING (public.is_tenant_owner_or_admin(tenant_id, auth.uid()));

-- 8. INVOICES
CREATE TABLE IF NOT EXISTS public.billing_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.tenant_subscriptions(id) ON DELETE SET NULL,
  provider_key text REFERENCES public.billing_providers(provider_key) ON DELETE SET NULL,
  provider_invoice_id text,
  invoice_number text,
  status public.invoice_status NOT NULL DEFAULT 'draft',
  currency text NOT NULL,
  subtotal_minor bigint NOT NULL DEFAULT 0,
  tax_minor bigint NOT NULL DEFAULT 0,
  total_minor bigint NOT NULL DEFAULT 0,
  amount_paid_minor bigint NOT NULL DEFAULT 0,
  hosted_invoice_url text,
  pdf_url text,
  due_date date,
  issued_at timestamptz,
  paid_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON public.billing_invoices (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_provider ON public.billing_invoices (provider_key, provider_invoice_id);
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_admin_all" ON public.billing_invoices FOR ALL
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));
CREATE POLICY "inv_tenant_read" ON public.billing_invoices
  FOR SELECT USING (public.is_tenant_owner_or_admin(tenant_id, auth.uid()));
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.billing_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. PAYMENT ATTEMPTS
CREATE TABLE IF NOT EXISTS public.billing_payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.tenant_subscriptions(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.billing_invoices(id) ON DELETE SET NULL,
  provider_key text REFERENCES public.billing_providers(provider_key) ON DELETE SET NULL,
  provider_payment_id text,
  status public.payment_attempt_status NOT NULL DEFAULT 'pending',
  amount_minor bigint NOT NULL,
  currency text NOT NULL,
  failure_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_attempts_tenant ON public.billing_payment_attempts (tenant_id, created_at DESC);
ALTER TABLE public.billing_payment_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "att_admin_all" ON public.billing_payment_attempts FOR ALL
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));
CREATE POLICY "att_tenant_read" ON public.billing_payment_attempts
  FOR SELECT USING (public.is_tenant_owner_or_admin(tenant_id, auth.uid()));
CREATE TRIGGER trg_attempts_updated BEFORE UPDATE ON public.billing_payment_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10. EVENT LOG
CREATE TABLE IF NOT EXISTS public.billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key text NOT NULL,
  provider_event_id text,
  event_type text NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES public.tenant_subscriptions(id) ON DELETE SET NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_key, provider_event_id)
);
CREATE INDEX IF NOT EXISTS idx_events_unprocessed
  ON public.billing_events (created_at) WHERE processed_at IS NULL;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_admin_only" ON public.billing_events FOR ALL
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));

-- 11. HELPERS
CREATE OR REPLACE FUNCTION public.get_tenant_active_subscription(_tenant_id uuid)
RETURNS TABLE (
  subscription_id uuid,
  tier_id uuid,
  tier_key text,
  tier_name text,
  status public.subscription_status,
  currency text,
  unit_amount_minor bigint,
  billing_interval public.billing_interval,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  limits jsonb,
  provider_key text
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    s.id, t.id, t.tier_key, t.display_name, s.status, s.currency,
    p.unit_amount_minor, p.billing_interval, s.current_period_end, s.trial_ends_at,
    t.limits, s.provider_key
  FROM public.tenant_subscriptions s
  JOIN public.billing_tiers t ON t.id = s.tier_id
  LEFT JOIN public.billing_tier_prices p ON p.id = s.price_id
  WHERE s.tenant_id = _tenant_id
    AND s.status IN ('trialling','active','past_due','incomplete')
  ORDER BY s.created_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_recommended_provider(_country text, _currency text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.preferred_provider
  FROM public.billing_routing_rules r
  JOIN public.billing_providers p ON p.provider_key = r.preferred_provider
  WHERE r.is_active = true
    AND p.is_enabled = true
    AND (r.match_country IS NULL OR r.match_country = _country)
    AND (r.match_currency IS NULL OR r.match_currency = _currency)
  ORDER BY r.priority ASC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.record_usage_event(
  _tenant_id uuid, _meter_key text, _quantity numeric DEFAULT 1, _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _sub_id uuid;
  _event_id uuid;
BEGIN
  SELECT id INTO _sub_id FROM public.tenant_subscriptions
  WHERE tenant_id = _tenant_id
    AND status IN ('trialling','active','past_due','incomplete')
  ORDER BY created_at DESC LIMIT 1;

  INSERT INTO public.billing_usage_events (tenant_id, subscription_id, meter_key, quantity, metadata)
  VALUES (_tenant_id, _sub_id, _meter_key, _quantity, _metadata)
  RETURNING id INTO _event_id;

  RETURN _event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_tenant_usage_summary(_tenant_id uuid, _since timestamptz DEFAULT (now() - interval '30 days'))
RETURNS TABLE (meter_key text, total_quantity numeric, event_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT meter_key, COALESCE(SUM(quantity),0)::numeric, COUNT(*)::bigint
  FROM public.billing_usage_events
  WHERE tenant_id = _tenant_id AND occurred_at >= _since
  GROUP BY meter_key
  ORDER BY meter_key;
$$;

-- 12. SEED
INSERT INTO public.billing_providers (provider_key, display_name, is_enabled, supported_currencies, supported_countries, sort_order) VALUES
  ('stripe',      'Stripe',      true,  ARRAY['USD','EUR','GBP','ZAR'],            ARRAY[]::text[], 10),
  ('paystack',    'Paystack',    false, ARRAY['NGN','GHS','ZAR','KES','USD'],      ARRAY['NG','GH','ZA','KE'], 20),
  ('flutterwave', 'Flutterwave', false, ARRAY['NGN','GHS','KES','UGX','TZS','ZAR','USD'], ARRAY['NG','GH','KE','UG','TZ','ZA','RW'], 30),
  ('payfast',     'Payfast',     false, ARRAY['ZAR'],                              ARRAY['ZA'], 40)
ON CONFLICT (provider_key) DO NOTHING;

INSERT INTO public.billing_tiers (tier_key, display_name, description, is_default, trial_days, sort_order, limits) VALUES
  ('free', 'Free', 'Perfect for trying things out', true, 0, 10,
   '{"max_users":5,"max_programmes":2,"ai_calls_per_month":50,"storage_gb":1,"custom_domain":false,"sso":false,"priority_support":false}'::jsonb),
  ('starter', 'Starter', 'Small teams getting started', false, 14, 20,
   '{"max_users":50,"max_programmes":10,"ai_calls_per_month":1000,"storage_gb":10,"custom_domain":true,"sso":false,"priority_support":false}'::jsonb),
  ('pro', 'Pro', 'Growing organisations', false, 14, 30,
   '{"max_users":500,"max_programmes":50,"ai_calls_per_month":10000,"storage_gb":100,"custom_domain":true,"sso":true,"priority_support":true}'::jsonb),
  ('enterprise', 'Enterprise', 'Custom-scale deployments', false, 0, 40,
   '{"max_users":-1,"max_programmes":-1,"ai_calls_per_month":-1,"storage_gb":-1,"custom_domain":true,"sso":true,"priority_support":true,"dedicated_csm":true}'::jsonb)
ON CONFLICT (tier_key) DO NOTHING;

WITH tier_ids AS (SELECT id, tier_key FROM public.billing_tiers)
INSERT INTO public.billing_tier_prices (tier_id, currency, billing_interval, unit_amount_minor)
SELECT t.id, c.currency, c.bi, c.amount
FROM tier_ids t
CROSS JOIN (VALUES
  ('starter','ZAR','monthly'::public.billing_interval,  49900),
  ('starter','ZAR','annual'::public.billing_interval,  499000),
  ('starter','USD','monthly'::public.billing_interval,   2900),
  ('starter','USD','annual'::public.billing_interval,   29000),
  ('pro','ZAR','monthly'::public.billing_interval,    149900),
  ('pro','ZAR','annual'::public.billing_interval,    1499000),
  ('pro','USD','monthly'::public.billing_interval,      8900),
  ('pro','USD','annual'::public.billing_interval,      89000),
  ('enterprise','ZAR','monthly'::public.billing_interval, 499900),
  ('enterprise','USD','monthly'::public.billing_interval,  29900)
) AS c(tier_key, currency, bi, amount)
WHERE t.tier_key = c.tier_key
ON CONFLICT (tier_id, currency, billing_interval) DO NOTHING;

INSERT INTO public.billing_routing_rules (match_country, match_currency, preferred_provider, priority, notes) VALUES
  ('ZA',   'ZAR', 'stripe',      50,  'Default ZA → Stripe until local provider enabled'),
  ('NG',   'NGN', 'paystack',    50,  'NG → Paystack (disabled until configured)'),
  ('GH',   'GHS', 'paystack',    50,  'GH → Paystack'),
  ('KE',   'KES', 'flutterwave', 50,  'KE → Flutterwave M-Pesa'),
  (NULL,   'USD', 'stripe',      100, 'Default USD → Stripe'),
  (NULL,   NULL,  'stripe',      999, 'Global fallback → Stripe')
ON CONFLICT DO NOTHING;
