
-- ============================================================================
-- PHASE 1A: Multi-Tenancy Data Isolation — Anchor Table Tagging + Helpers
-- ============================================================================
-- Strategy: Add tenant_id to top-level "anchor" tables. Children inherit
-- tenancy via FK chains and helper functions. This avoids modifying ~120
-- child tables while still enforcing strict tenant isolation through RLS.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Ensure a "default" tenant exists for backfill
-- ----------------------------------------------------------------------------
INSERT INTO public.tenants (name, slug, status, subscription_tier)
SELECT 'Default Tenant', 'default', 'active', 'standard'
WHERE NOT EXISTS (SELECT 1 FROM public.tenants WHERE slug = 'default');

-- Capture default tenant id into a temp setting
DO $$
DECLARE
  _default_tenant uuid;
BEGIN
  SELECT id INTO _default_tenant FROM public.tenants ORDER BY created_at ASC LIMIT 1;
  PERFORM set_config('app.default_tenant_id', _default_tenant::text, false);
END $$;

-- ----------------------------------------------------------------------------
-- 2. Add tenant_id to anchor tables (no FK constraint chain — keep nullable,
--    we'll harden after backfill in Phase 1B)
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles            ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.user_roles          ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.assessments         ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.sponsor_profiles    ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.programme_types     ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.pathways            ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.question_banks      ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.rubrics             ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.grading_scales      ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.badges              ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.certificate_templates ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.shared_content_items ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.external_content_providers ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.lti_registrations   ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.role_definitions    ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.workflow_templates  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.font_library        ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.typography_presets  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.wbt_projects        ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.staff_registrations ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.cms_menus           ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.cms_pages           ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.compliance_requirements ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.policy_documents    ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.skills              ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id ON public.user_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assessments_tenant_id ON public.assessments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_profiles_tenant_id ON public.sponsor_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_programme_types_tenant_id ON public.programme_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assessments_tenant_id_programme ON public.assessments(tenant_id, programme_id);

-- ----------------------------------------------------------------------------
-- 3. BACKFILL — assign all existing rows to the default tenant
-- ----------------------------------------------------------------------------
DO $$
DECLARE _t uuid;
BEGIN
  SELECT id INTO _t FROM public.tenants ORDER BY created_at ASC LIMIT 1;
  IF _t IS NULL THEN RETURN; END IF;

  UPDATE public.profiles            SET tenant_id = _t WHERE tenant_id IS NULL;
  UPDATE public.user_roles          SET tenant_id = _t WHERE tenant_id IS NULL;
  UPDATE public.assessments         SET tenant_id = _t WHERE tenant_id IS NULL;
  UPDATE public.sponsor_profiles    SET tenant_id = _t WHERE tenant_id IS NULL;
  UPDATE public.programme_types     SET tenant_id = _t WHERE tenant_id IS NULL;
  UPDATE public.pathways            SET tenant_id = _t WHERE tenant_id IS NULL;
  UPDATE public.question_banks      SET tenant_id = _t WHERE tenant_id IS NULL;
  UPDATE public.rubrics             SET tenant_id = _t WHERE tenant_id IS NULL;
  UPDATE public.grading_scales      SET tenant_id = _t WHERE tenant_id IS NULL;
  UPDATE public.badges              SET tenant_id = _t WHERE tenant_id IS NULL;
  UPDATE public.certificate_templates SET tenant_id = _t WHERE tenant_id IS NULL;
  UPDATE public.shared_content_items SET tenant_id = _t WHERE tenant_id IS NULL;
  UPDATE public.external_content_providers SET tenant_id = _t WHERE tenant_id IS NULL;
  UPDATE public.lti_registrations   SET tenant_id = _t WHERE tenant_id IS NULL;
  UPDATE public.role_definitions    SET tenant_id = _t WHERE tenant_id IS NULL;
  UPDATE public.workflow_templates  SET tenant_id = _t WHERE tenant_id IS NULL;
  UPDATE public.font_library        SET tenant_id = _t WHERE tenant_id IS NULL;
  UPDATE public.typography_presets  SET tenant_id = _t WHERE tenant_id IS NULL;
  UPDATE public.wbt_projects        SET tenant_id = _t WHERE tenant_id IS NULL;
  UPDATE public.staff_registrations SET tenant_id = _t WHERE tenant_id IS NULL;
  UPDATE public.cms_menus           SET tenant_id = _t WHERE tenant_id IS NULL;
  UPDATE public.cms_pages           SET tenant_id = _t WHERE tenant_id IS NULL;
  UPDATE public.compliance_requirements SET tenant_id = _t WHERE tenant_id IS NULL;
  UPDATE public.policy_documents    SET tenant_id = _t WHERE tenant_id IS NULL;
  UPDATE public.skills              SET tenant_id = _t WHERE tenant_id IS NULL;

  -- Ensure all existing users are in the default tenant
  INSERT INTO public.tenant_users (tenant_id, user_id, role, is_active)
  SELECT _t, p.user_id, 'member', true
  FROM public.profiles p
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tenant_users tu WHERE tu.user_id = p.user_id AND tu.tenant_id = _t
  );
END $$;

-- ----------------------------------------------------------------------------
-- 4. HELPER FUNCTIONS — current tenant resolution + child→tenant lookups
-- ----------------------------------------------------------------------------

-- Returns the user's "active" tenant. For now: first active membership.
-- Later we'll wire this to a session GUC set by the client.
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT tenant_id FROM public.tenant_users
  WHERE user_id = auth.uid() AND is_active = true
  ORDER BY joined_at ASC
  LIMIT 1
$$;

-- Returns true if the user can access data in the given tenant
-- (member of tenant OR platform admin)
CREATE OR REPLACE FUNCTION public.can_access_tenant(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    _tenant_id IS NULL
    OR public.is_platform_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.tenant_users
      WHERE user_id = auth.uid()
        AND tenant_id = _tenant_id
        AND is_active = true
    )
$$;

-- Resolve tenant from a programme_id (used by child tables: modules, lessons, etc.)
CREATE OR REPLACE FUNCTION public.tenant_for_programme(_programme_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT tenant_id FROM public.programmes WHERE id = _programme_id
$$;

-- Resolve tenant from an assessment_id
CREATE OR REPLACE FUNCTION public.tenant_for_assessment(_assessment_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT tenant_id FROM public.assessments WHERE id = _assessment_id
$$;

-- Resolve tenant from a cohort_id
CREATE OR REPLACE FUNCTION public.tenant_for_cohort(_cohort_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT tenant_id FROM public.cohorts WHERE id = _cohort_id
$$;

-- Resolve tenant from a user_id (their primary tenant)
CREATE OR REPLACE FUNCTION public.tenant_for_user(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT tenant_id FROM public.tenant_users
  WHERE user_id = _user_id AND is_active = true
  ORDER BY joined_at ASC LIMIT 1
$$;

-- ----------------------------------------------------------------------------
-- 5. AUTO-INJECTION TRIGGER — sets tenant_id on insert if not provided
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_tenant_id_default()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.current_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

-- Attach to all anchor tables
DO $$
DECLARE
  _tbl text;
  _anchor_tables text[] := ARRAY[
    'profiles','user_roles','assessments','sponsor_profiles','programme_types',
    'pathways','question_banks','rubrics','grading_scales','badges',
    'certificate_templates','shared_content_items','external_content_providers',
    'lti_registrations','role_definitions','workflow_templates','font_library',
    'typography_presets','wbt_projects','staff_registrations','cms_menus',
    'cms_pages','compliance_requirements','policy_documents','skills',
    'programmes','cohorts','enrolments','learner_registrations','announcements',
    'training_sessions','payment_gateways','payment_routing_rules','payment_transactions'
  ];
BEGIN
  FOREACH _tbl IN ARRAY _anchor_tables LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_set_tenant_id ON public.%I;
       CREATE TRIGGER trg_set_tenant_id
         BEFORE INSERT ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default();',
      _tbl, _tbl
    );
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 6. AUDIT LOG TRIGGER — populate tenant_audit_log on key tenant changes
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_tenant_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _tenant_id uuid;
  _action text;
BEGIN
  _tenant_id := COALESCE(NEW.tenant_id, OLD.tenant_id);
  IF _tenant_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  _action := TG_OP || '_' || TG_TABLE_NAME;

  INSERT INTO public.tenant_audit_log (tenant_id, action, entity_type, entity_id, performed_by, details)
  VALUES (
    _tenant_id, _action, TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    auth.uid(),
    jsonb_build_object('op', TG_OP, 'table', TG_TABLE_NAME)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach audit trigger to tenant config + tenant_users
DROP TRIGGER IF EXISTS trg_audit_tenant_users ON public.tenant_users;
CREATE TRIGGER trg_audit_tenant_users
  AFTER INSERT OR UPDATE OR DELETE ON public.tenant_users
  FOR EACH ROW EXECUTE FUNCTION public.log_tenant_event();

DROP TRIGGER IF EXISTS trg_audit_tenant_feature_flags ON public.tenant_feature_flags;
CREATE TRIGGER trg_audit_tenant_feature_flags
  AFTER INSERT OR UPDATE OR DELETE ON public.tenant_feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.log_tenant_event();

-- ----------------------------------------------------------------------------
-- 7. QUOTA ENFORCEMENT — block inserts that exceed max_users / max_programmes
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_tenant_user_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _max int;
  _current int;
BEGIN
  SELECT max_users INTO _max FROM public.tenants WHERE id = NEW.tenant_id;
  IF _max IS NULL THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO _current FROM public.tenant_users
  WHERE tenant_id = NEW.tenant_id AND is_active = true;

  IF _current >= _max THEN
    RAISE EXCEPTION 'Tenant user quota exceeded (limit: %).', _max
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_tenant_user_quota ON public.tenant_users;
CREATE TRIGGER trg_enforce_tenant_user_quota
  BEFORE INSERT ON public.tenant_users
  FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_user_quota();

CREATE OR REPLACE FUNCTION public.enforce_tenant_programme_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _max int;
  _current int;
BEGIN
  IF NEW.tenant_id IS NULL THEN RETURN NEW; END IF;
  SELECT max_programmes INTO _max FROM public.tenants WHERE id = NEW.tenant_id;
  IF _max IS NULL THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO _current FROM public.programmes
  WHERE tenant_id = NEW.tenant_id;

  IF _current >= _max THEN
    RAISE EXCEPTION 'Tenant programme quota exceeded (limit: %).', _max
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_tenant_programme_quota ON public.programmes;
CREATE TRIGGER trg_enforce_tenant_programme_quota
  BEFORE INSERT ON public.programmes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_programme_quota();
