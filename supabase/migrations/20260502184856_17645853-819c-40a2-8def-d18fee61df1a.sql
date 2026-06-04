-- ============================================================
-- 1. EXTEND billing_providers (the platform catalog)
-- ============================================================
ALTER TABLE public.billing_providers
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS gateway_type text NOT NULL DEFAULT 'both'
    CHECK (gateway_type IN ('subscription','one_off','both')),
  ADD COLUMN IF NOT EXISTS is_available_to_tenants boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS supported_currencies text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS supported_countries text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS credential_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS setup_instructions text,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 100;

-- Backfill display_name from provider_key where missing
UPDATE public.billing_providers
SET display_name = INITCAP(REPLACE(provider_key, '_', ' '))
WHERE display_name IS NULL;

-- ============================================================
-- 2. SEED known gateways (idempotent upsert)
-- credential_schema = JSON array of {key,label,type,required,help} for dynamic forms
-- ============================================================
INSERT INTO public.billing_providers (provider_key, display_name, gateway_type, is_enabled, is_available_to_tenants, supported_currencies, supported_countries, credential_schema, setup_instructions, sort_order)
VALUES
  ('stripe', 'Stripe', 'both', false, false,
   ARRAY['USD','EUR','GBP','ZAR','KES','NGN','GHS'],
   ARRAY['US','GB','EU','ZA','KE','NG','GH','*'],
   '[
     {"key":"publishable_key","label":"Publishable Key","type":"text","required":true,"help":"pk_live_… or pk_test_…"},
     {"key":"secret_key","label":"Secret Key","type":"password","required":true,"help":"sk_live_… or sk_test_…"},
     {"key":"webhook_secret","label":"Webhook Signing Secret","type":"password","required":false,"help":"whsec_…"}
   ]'::jsonb,
   'Create a Stripe account at dashboard.stripe.com, then copy your API keys from Developers → API keys.', 10),

  ('flutterwave', 'Flutterwave', 'both', false, false,
   ARRAY['NGN','GHS','KES','UGX','TZS','ZAR','USD','EUR','GBP'],
   ARRAY['NG','GH','KE','UG','TZ','ZA','*'],
   '[
     {"key":"public_key","label":"Public Key","type":"text","required":true,"help":"FLWPUBK_TEST-… or FLWPUBK-…"},
     {"key":"secret_key","label":"Secret Key","type":"password","required":true,"help":"FLWSECK_TEST-… or FLWSECK-…"},
     {"key":"encryption_key","label":"Encryption Key","type":"password","required":true},
     {"key":"webhook_secret_hash","label":"Webhook Secret Hash","type":"password","required":false}
   ]'::jsonb,
   'Sign up at flutterwave.com, then copy your API keys from Settings → API.', 20),

  ('paystack', 'Paystack', 'both', false, false,
   ARRAY['NGN','GHS','ZAR','USD','KES'],
   ARRAY['NG','GH','ZA','KE'],
   '[
     {"key":"public_key","label":"Public Key","type":"text","required":true,"help":"pk_live_… or pk_test_…"},
     {"key":"secret_key","label":"Secret Key","type":"password","required":true,"help":"sk_live_… or sk_test_…"}
   ]'::jsonb,
   'Sign up at paystack.com, then copy your API keys from Settings → API Keys & Webhooks.', 30),

  ('payfast', 'Payfast', 'both', false, false,
   ARRAY['ZAR'],
   ARRAY['ZA'],
   '[
     {"key":"merchant_id","label":"Merchant ID","type":"text","required":true},
     {"key":"merchant_key","label":"Merchant Key","type":"text","required":true},
     {"key":"passphrase","label":"Passphrase","type":"password","required":false,"help":"Optional but recommended for ITN security."}
   ]'::jsonb,
   'Register at payfast.io, then find your Merchant ID and Key under Settings → Integration.', 40)
ON CONFLICT (provider_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  gateway_type = EXCLUDED.gateway_type,
  supported_currencies = EXCLUDED.supported_currencies,
  supported_countries = EXCLUDED.supported_countries,
  credential_schema = EXCLUDED.credential_schema,
  setup_instructions = EXCLUDED.setup_instructions,
  sort_order = EXCLUDED.sort_order;

-- ============================================================
-- 3. tenant_payment_gateways (per-tenant opt-in + creds)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tenant_payment_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider_key text NOT NULL REFERENCES public.billing_providers(provider_key) ON DELETE RESTRICT,
  is_enabled boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  mode text NOT NULL DEFAULT 'test' CHECK (mode IN ('test','live')),
  credentials_test jsonb NOT NULL DEFAULT '{}'::jsonb,
  credentials_live jsonb NOT NULL DEFAULT '{}'::jsonb,
  display_label text,
  last_verified_at timestamptz,
  verification_status text DEFAULT 'unverified' CHECK (verification_status IN ('unverified','verified','failed')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider_key)
);

CREATE INDEX IF NOT EXISTS idx_tpg_tenant ON public.tenant_payment_gateways(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tpg_provider ON public.tenant_payment_gateways(provider_key);

ALTER TABLE public.tenant_payment_gateways ENABLE ROW LEVEL SECURITY;

-- Updated_at trigger
CREATE TRIGGER trg_tpg_updated_at
BEFORE UPDATE ON public.tenant_payment_gateways
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Only one default per tenant
CREATE OR REPLACE FUNCTION public.enforce_single_default_gateway()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.tenant_payment_gateways
    SET is_default = false
    WHERE tenant_id = NEW.tenant_id
      AND id <> NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_tpg_single_default
AFTER INSERT OR UPDATE OF is_default ON public.tenant_payment_gateways
FOR EACH ROW WHEN (NEW.is_default = true)
EXECUTE FUNCTION public.enforce_single_default_gateway();

-- RLS POLICIES (tenant owners/admins + platform admins only)
CREATE POLICY "tpg_select_owners_or_platform"
  ON public.tenant_payment_gateways FOR SELECT
  USING (
    public.is_platform_admin(auth.uid())
    OR public.is_tenant_owner_or_admin(tenant_id, auth.uid())
  );

CREATE POLICY "tpg_insert_owners_or_platform"
  ON public.tenant_payment_gateways FOR INSERT
  WITH CHECK (
    public.is_platform_admin(auth.uid())
    OR public.is_tenant_owner_or_admin(tenant_id, auth.uid())
  );

CREATE POLICY "tpg_update_owners_or_platform"
  ON public.tenant_payment_gateways FOR UPDATE
  USING (
    public.is_platform_admin(auth.uid())
    OR public.is_tenant_owner_or_admin(tenant_id, auth.uid())
  );

CREATE POLICY "tpg_delete_owners_or_platform"
  ON public.tenant_payment_gateways FOR DELETE
  USING (
    public.is_platform_admin(auth.uid())
    OR public.is_tenant_owner_or_admin(tenant_id, auth.uid())
  );

-- ============================================================
-- 4. RPC: get available gateways for a tenant (catalog filtered)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_available_gateways_for_tenant(_tenant_id uuid)
RETURNS TABLE (
  provider_key text,
  display_name text,
  logo_url text,
  gateway_type text,
  supported_currencies text[],
  supported_countries text[],
  credential_schema jsonb,
  setup_instructions text,
  is_enabled_for_tenant boolean,
  is_default boolean,
  mode text,
  verification_status text,
  sort_order integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    bp.provider_key,
    bp.display_name,
    bp.logo_url,
    bp.gateway_type,
    bp.supported_currencies,
    bp.supported_countries,
    bp.credential_schema,
    bp.setup_instructions,
    COALESCE(tpg.is_enabled, false) AS is_enabled_for_tenant,
    COALESCE(tpg.is_default, false) AS is_default,
    COALESCE(tpg.mode, 'test') AS mode,
    COALESCE(tpg.verification_status, 'unverified') AS verification_status,
    bp.sort_order
  FROM public.billing_providers bp
  LEFT JOIN public.tenant_payment_gateways tpg
    ON tpg.provider_key = bp.provider_key AND tpg.tenant_id = _tenant_id
  WHERE bp.is_available_to_tenants = true
  ORDER BY bp.sort_order, bp.display_name;
$$;

-- ============================================================
-- 5. Bridge: legacy payment_gateways → billing_providers catalog
-- (only flips the availability flag if a matching provider exists)
-- ============================================================
CREATE OR REPLACE FUNCTION public.bridge_legacy_payment_gateway()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.billing_providers
  SET is_available_to_tenants = true
  WHERE provider_key = NEW.gateway_type
    AND is_available_to_tenants = false;
  RETURN NEW;
END; $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='payment_gateways') THEN
    DROP TRIGGER IF EXISTS trg_bridge_legacy_payment_gateway ON public.payment_gateways;
    CREATE TRIGGER trg_bridge_legacy_payment_gateway
    AFTER INSERT ON public.payment_gateways
    FOR EACH ROW EXECUTE FUNCTION public.bridge_legacy_payment_gateway();
  END IF;
END $$;
