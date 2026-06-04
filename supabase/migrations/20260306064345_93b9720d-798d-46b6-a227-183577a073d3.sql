
-- ============================================
-- MULTI-TENANCY FOUNDATION SCHEMA
-- ============================================

-- 1. Core tenants table
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  domain text UNIQUE,
  logo_url text,
  favicon_url text,
  primary_color text DEFAULT '#6366f1',
  secondary_color text DEFAULT '#8b5cf6',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
  settings jsonb DEFAULT '{}'::jsonb,
  max_users integer,
  max_programmes integer,
  subscription_tier text DEFAULT 'standard',
  contact_email text,
  contact_phone text,
  address text,
  country text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Tenant-user mapping (a user can belong to multiple tenants)
CREATE TABLE public.tenant_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  is_active boolean NOT NULL DEFAULT true,
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);

-- 3. Tenant feature flags
CREATE TABLE public.tenant_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  flag_key text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, flag_key)
);

-- 4. Tenant audit log
CREATE TABLE public.tenant_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  performed_by uuid,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Add tenant_id to programmes (nullable for backward compatibility)
ALTER TABLE public.programmes ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;

-- 6. Add tenant_id to cohorts
ALTER TABLE public.cohorts ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;

-- 7. Add tenant_id to enrolments
ALTER TABLE public.enrolments ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;

-- 8. Add tenant_id to learner_registrations
ALTER TABLE public.learner_registrations ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;

-- 9. Add tenant_id to announcements
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;

-- 10. Add tenant_id to training_sessions
ALTER TABLE public.training_sessions ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;

-- ============================================
-- SECURITY DEFINER FUNCTIONS
-- ============================================

-- Get current user's active tenant IDs
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.tenant_users
  WHERE user_id = _user_id AND is_active = true
$$;

-- Check if user belongs to a specific tenant
CREATE OR REPLACE FUNCTION public.is_tenant_member(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE user_id = _user_id AND tenant_id = _tenant_id AND is_active = true
  )
$$;

-- Check if user is tenant admin/owner
CREATE OR REPLACE FUNCTION public.is_tenant_admin(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE user_id = _user_id AND tenant_id = _tenant_id AND is_active = true
    AND role IN ('owner', 'admin')
  )
$$;

-- Check if user is platform super_admin (cross-tenant access)
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin', 'systems_admin')
  )
$$;

-- ============================================
-- RLS POLICIES
-- ============================================

-- TENANTS TABLE
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage all tenants"
  ON public.tenants FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Tenant members can view their tenant"
  ON public.tenants FOR SELECT TO authenticated
  USING (id IN (SELECT public.get_user_tenant_ids(auth.uid())));

-- TENANT_USERS TABLE
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage all tenant users"
  ON public.tenant_users FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Tenant admins can manage their tenant users"
  ON public.tenant_users FOR ALL TO authenticated
  USING (public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Users can view their own tenant memberships"
  ON public.tenant_users FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- TENANT_FEATURE_FLAGS TABLE
ALTER TABLE public.tenant_feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage all feature flags"
  ON public.tenant_feature_flags FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Tenant members can view their flags"
  ON public.tenant_feature_flags FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

-- TENANT_AUDIT_LOG TABLE
ALTER TABLE public.tenant_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view all audit logs"
  ON public.tenant_audit_log FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Tenant admins can view their audit logs"
  ON public.tenant_audit_log FOR SELECT TO authenticated
  USING (public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Authenticated users can insert audit logs"
  ON public.tenant_audit_log FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON public.tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON public.tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_domain ON public.tenants(domain);
CREATE INDEX IF NOT EXISTS idx_programmes_tenant_id ON public.programmes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cohorts_tenant_id ON public.cohorts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_enrolments_tenant_id ON public.enrolments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_learner_registrations_tenant_id ON public.learner_registrations(tenant_id);

-- ============================================
-- AUTO-UPDATE TRIGGER
-- ============================================
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_users_updated_at
  BEFORE UPDATE ON public.tenant_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
