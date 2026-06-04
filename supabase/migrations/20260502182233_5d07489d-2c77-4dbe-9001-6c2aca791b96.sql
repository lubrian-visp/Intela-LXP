
-- 1. Trigger: auto-assign Free tier to every new tenant
CREATE OR REPLACE FUNCTION public.bootstrap_tenant_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _tier_id uuid;
BEGIN
  SELECT id INTO _tier_id FROM public.billing_tiers
  WHERE is_default = true AND is_active = true
  LIMIT 1;

  IF _tier_id IS NULL THEN
    SELECT id INTO _tier_id FROM public.billing_tiers
    WHERE is_active = true ORDER BY sort_order ASC LIMIT 1;
  END IF;

  IF _tier_id IS NOT NULL THEN
    INSERT INTO public.tenant_subscriptions (tenant_id, tier_id, status, current_period_start, current_period_end)
    VALUES (NEW.id, _tier_id, 'active', now(), now() + interval '100 years')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bootstrap_tenant_subscription ON public.tenants;
CREATE TRIGGER trg_bootstrap_tenant_subscription
AFTER INSERT ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.bootstrap_tenant_subscription();

-- 2. Backfill: any tenant lacking a subscription gets Free tier
INSERT INTO public.tenant_subscriptions (tenant_id, tier_id, status, current_period_start, current_period_end)
SELECT t.id,
       (SELECT id FROM public.billing_tiers WHERE is_default = true LIMIT 1),
       'active', now(), now() + interval '100 years'
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.tenant_subscriptions s
  WHERE s.tenant_id = t.id
    AND s.status IN ('trialling','active','past_due','incomplete')
);

-- 3. Fix invoice overdue trigger (enum is {draft,open,paid,past_due,void,refunded})
CREATE OR REPLACE FUNCTION public.check_invoice_overdue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'open' AND NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE THEN
    NEW.status := 'past_due';
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Helper: issue a manual invoice (platform admin only)
CREATE OR REPLACE FUNCTION public.issue_manual_invoice(
  _tenant_id uuid,
  _currency text,
  _subtotal_minor bigint,
  _tax_minor bigint DEFAULT 0,
  _due_days integer DEFAULT 30,
  _invoice_number text DEFAULT NULL,
  _notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _invoice_id uuid;
  _sub_id uuid;
  _number text;
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only platform admins may issue manual invoices'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT id INTO _sub_id FROM public.tenant_subscriptions
  WHERE tenant_id = _tenant_id
    AND status IN ('trialling','active','past_due','incomplete')
  ORDER BY created_at DESC LIMIT 1;

  _number := COALESCE(_invoice_number, 'INV-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6));

  INSERT INTO public.billing_invoices (
    tenant_id, subscription_id, invoice_number, status, currency,
    subtotal_minor, tax_minor, total_minor, due_date, issued_at, metadata
  ) VALUES (
    _tenant_id, _sub_id, _number, 'open', UPPER(_currency),
    _subtotal_minor, _tax_minor, _subtotal_minor + COALESCE(_tax_minor, 0),
    CURRENT_DATE + (_due_days || ' days')::interval,
    now(),
    jsonb_build_object('source', 'manual', 'issued_by', auth.uid(), 'notes', _notes)
  ) RETURNING id INTO _invoice_id;

  RETURN _invoice_id;
END;
$$;

-- 5. Helper: mark a manual invoice paid
CREATE OR REPLACE FUNCTION public.mark_invoice_paid(
  _invoice_id uuid,
  _payment_reference text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only platform admins may mark invoices paid'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.billing_invoices
  SET status = 'paid',
      paid_at = now(),
      amount_paid_minor = total_minor,
      metadata = metadata || jsonb_build_object('paid_by', auth.uid(), 'payment_reference', _payment_reference)
  WHERE id = _invoice_id;
END;
$$;

-- 6. Helper: void a manual invoice
CREATE OR REPLACE FUNCTION public.void_invoice(_invoice_id uuid, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only platform admins may void invoices'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  UPDATE public.billing_invoices
  SET status = 'void',
      metadata = metadata || jsonb_build_object('voided_by', auth.uid(), 'void_reason', _reason, 'voided_at', now())
  WHERE id = _invoice_id;
END;
$$;
