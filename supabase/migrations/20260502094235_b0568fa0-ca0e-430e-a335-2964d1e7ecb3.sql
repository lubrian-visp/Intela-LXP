-- =====================================================================
-- PHASE 1B: TENANT ISOLATION VIA RESTRICTIVE RLS POLICIES
-- =====================================================================
-- Strategy: Add RESTRICTIVE policies that enforce can_access_tenant()
-- on top of existing PERMISSIVE role-based policies. Postgres combines
-- them with AND, giving us tenant isolation without rewriting ~80 policies.
-- =====================================================================

-- 1. SESSION-LEVEL ACTIVE TENANT (via GUC, with fallback to first membership)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_active_tenant(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate access before setting
  IF NOT can_access_tenant(_tenant_id) THEN
    RAISE EXCEPTION 'You do not have access to tenant %', _tenant_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  PERFORM set_config('app.active_tenant_id', _tenant_id::text, false);
END;
$$;

-- Override current_tenant_id to prefer session GUC, fallback to first membership
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _session_tid text;
  _tid uuid;
BEGIN
  BEGIN
    _session_tid := current_setting('app.active_tenant_id', true);
  EXCEPTION WHEN OTHERS THEN
    _session_tid := NULL;
  END;

  IF _session_tid IS NOT NULL AND _session_tid <> '' THEN
    BEGIN
      _tid := _session_tid::uuid;
      RETURN _tid;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- Fallback: first active membership
  SELECT tenant_id INTO _tid
  FROM public.tenant_users
  WHERE user_id = auth.uid() AND is_active = true
  ORDER BY joined_at ASC
  LIMIT 1;

  RETURN _tid;
END;
$$;

-- 2. RESTRICTIVE TENANT-ISOLATION POLICY HELPER
-- ---------------------------------------------------------------------
-- Apply restrictive "tenant fence" to anchor tables. These combine via
-- AND with existing role-based permissive policies.
DO $$
DECLARE
  _t text;
  _anchor_tables text[] := ARRAY[
    'profiles','user_roles','programmes','assessments','cohorts',
    'enrolments','programme_types','pathways','issued_credentials',
    'learner_registrations','staff_registrations','tenant_feature_flags',
    'tenant_audit_log','tenant_branding','tenant_invitations',
    'platform_settings','typography_settings','design_themes',
    'workflow_templates','workflow_instances','assessor_report_templates',
    'role_definitions','custom_roles','rubrics','question_bank',
    'sponsor_organizations'
  ];
BEGIN
  FOREACH _t IN ARRAY _anchor_tables LOOP
    -- Skip if table doesn't exist or has no tenant_id column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = _t AND column_name = 'tenant_id'
    ) THEN
      CONTINUE;
    END IF;

    -- Drop existing fence policy if present
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_fence" ON public.%I', _t);

    -- Add restrictive fence: row must belong to an accessible tenant
    -- (NULL tenant_id is allowed for legacy/global rows + platform admins bypass)
    EXECUTE format($f$
      CREATE POLICY "tenant_isolation_fence" ON public.%I
      AS RESTRICTIVE
      FOR ALL
      TO authenticated
      USING (public.can_access_tenant(tenant_id))
      WITH CHECK (public.can_access_tenant(tenant_id))
    $f$, _t);
  END LOOP;
END$$;

-- 3. TENANT INVITATIONS TABLE (Phase 2 lifecycle prep)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);

ALTER TABLE public.tenant_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant admins manage invitations" ON public.tenant_invitations;
CREATE POLICY "Tenant admins manage invitations"
ON public.tenant_invitations FOR ALL
TO authenticated
USING (is_tenant_admin(auth.uid(), tenant_id) OR is_platform_admin(auth.uid()))
WITH CHECK (is_tenant_admin(auth.uid(), tenant_id) OR is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Invitees can read their pending invites" ON public.tenant_invitations;
CREATE POLICY "Invitees can read their pending invites"
ON public.tenant_invitations FOR SELECT
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_tenant_invitations_email ON public.tenant_invitations(email);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_token ON public.tenant_invitations(token);

-- 4. ACCEPT INVITATION RPC
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_tenant_invitation(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inv record;
  _user_email text;
BEGIN
  SELECT email INTO _user_email FROM auth.users WHERE id = auth.uid();
  IF _user_email IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _inv FROM public.tenant_invitations
  WHERE token = _token AND status = 'pending' AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  IF lower(_inv.email) <> lower(_user_email) THEN
    RAISE EXCEPTION 'Invitation email does not match your account';
  END IF;

  -- Add membership (idempotent)
  INSERT INTO public.tenant_users (tenant_id, user_id, role, is_active)
  VALUES (_inv.tenant_id, auth.uid(), _inv.role, true)
  ON CONFLICT (tenant_id, user_id) DO UPDATE
    SET is_active = true, role = EXCLUDED.role;

  -- Mark invitation accepted
  UPDATE public.tenant_invitations
  SET status = 'accepted', accepted_at = now(), accepted_by = auth.uid()
  WHERE id = _inv.id;

  RETURN _inv.tenant_id;
END;
$$;

-- 5. SUSPEND TENANT CASCADE
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.suspend_tenant(_tenant_id uuid, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only platform admins may suspend tenants';
  END IF;

  UPDATE public.tenants SET status = 'suspended', updated_at = now()
  WHERE id = _tenant_id;

  UPDATE public.tenant_users SET is_active = false
  WHERE tenant_id = _tenant_id;

  INSERT INTO public.tenant_audit_log (tenant_id, action, entity_type, entity_id, performed_by, details)
  VALUES (_tenant_id, 'suspend_tenant', 'tenant', _tenant_id::text, auth.uid(),
          jsonb_build_object('reason', _reason));
END;
$$;

-- 6. REACTIVATE TENANT
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reactivate_tenant(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only platform admins may reactivate tenants';
  END IF;

  UPDATE public.tenants SET status = 'active', updated_at = now()
  WHERE id = _tenant_id;

  INSERT INTO public.tenant_audit_log (tenant_id, action, entity_type, entity_id, performed_by, details)
  VALUES (_tenant_id, 'reactivate_tenant', 'tenant', _tenant_id::text, auth.uid(), '{}'::jsonb);
END;
$$;

-- 7. GRANTS
GRANT EXECUTE ON FUNCTION public.set_active_tenant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_tenant_invitation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.suspend_tenant(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reactivate_tenant(uuid) TO authenticated;