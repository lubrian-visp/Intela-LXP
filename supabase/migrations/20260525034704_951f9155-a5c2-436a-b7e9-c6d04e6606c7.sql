
-- R1: Lock down all SECURITY DEFINER functions in public schema
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END$$;

-- Re-grant EXECUTE only on the client-callable RPC allow-list (authenticated users only)
DO $$
DECLARE
  sigs text[] := ARRAY[
    'public.accept_tenant_invitation(text)',
    'public.add_tenant_domain(uuid, text, text)',
    'public.can_act_on_workflow_step(uuid, uuid)',
    'public.can_approve_programme(uuid, uuid)',
    'public.can_edit_programme_content(uuid, uuid)',
    'public.delete_email(text, bigint)',
    'public.get_available_gateways_for_tenant(uuid)',
    'public.get_platform_analytics()',
    'public.get_tenant_active_subscription(uuid)',
    'public.get_tenant_effective_flags(uuid)',
    'public.get_tenant_quota_usage(uuid)',
    'public.has_permission(uuid, text, text)',
    'public.issue_manual_invoice(uuid, text, bigint, bigint, integer, text, text)',
    'public.mark_invoice_paid(uuid, text)',
    'public.move_to_dlq(text, text, bigint, jsonb)',
    'public.read_email_batch(text, integer, integer)',
    'public.remove_tenant_domain(uuid)',
    'public.set_active_tenant(uuid)',
    'public.set_primary_tenant_domain(uuid)',
    'public.set_tenant_member_role(uuid, uuid, text, boolean)',
    'public.update_tenant_branding(uuid, text, text, text, text, text, text)',
    'public.verify_tenant_domain(uuid, boolean)',
    'public.void_invoice(uuid, text)',
    'public.wbt_suggest_mentors(uuid, integer)'
  ];
  s text;
BEGIN
  FOREACH s IN ARRAY sigs LOOP
    BEGIN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', s);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'Skip missing function: %', s;
    END;
  END LOOP;
END$$;

-- Public (anon-callable) lookup endpoints
DO $$
DECLARE
  pubs text[] := ARRAY[
    'public.resolve_tenant_by_hostname(text)',
    'public.get_tenant_branding(text)'
  ];
  s text;
BEGIN
  FOREACH s IN ARRAY pubs LOOP
    BEGIN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated', s);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'Skip missing function: %', s;
    END;
  END LOOP;
END$$;

-- R2: Force SECURITY INVOKER on flagged view
ALTER VIEW IF EXISTS public.credential_verification_safe
  SET (security_invoker = true, security_barrier = true);

-- R3: Restrict broad bucket SELECT policies (no whole-bucket listing)
DROP POLICY IF EXISTS "Content block media public read" ON storage.objects;
DROP POLICY IF EXISTS "tenant_assets_public_read" ON storage.objects;

CREATE POLICY "Content block media: read individual files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'content-block-media'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND name NOT LIKE '%/'
);

CREATE POLICY "Tenant assets: read individual files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'tenant-assets'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND name NOT LIKE '%/'
);
