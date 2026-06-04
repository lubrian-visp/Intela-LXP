-- =============================================================================
-- Phase 3: Per-Tenant Feature Flags & Quota Enforcement
-- =============================================================================

-- 1. Canonical catalog of available feature flags (platform-wide registry)
CREATE TABLE IF NOT EXISTS public.feature_flag_catalog (
  flag_key       text PRIMARY KEY,
  display_name   text NOT NULL,
  description    text,
  category       text NOT NULL DEFAULT 'general',
  default_value  boolean NOT NULL DEFAULT true,
  min_tier       text NOT NULL DEFAULT 'free',  -- free | standard | professional | enterprise
  sort_order     integer NOT NULL DEFAULT 100,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flag_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read catalog"
  ON public.feature_flag_catalog FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Platform admins manage catalog"
  ON public.feature_flag_catalog FOR ALL
  TO authenticated
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

-- 2. Seed catalog with platform features
INSERT INTO public.feature_flag_catalog (flag_key, display_name, description, category, default_value, min_tier, sort_order) VALUES
  -- Core modules
  ('module_programmes',         'Programmes',                  'Core programme management module',                          'core',         true,  'free',         10),
  ('module_assessments',        'Assessments',                 'Assessment authoring, submission and grading',              'core',         true,  'free',         20),
  ('module_cohorts',            'Cohorts',                     'Cohort scheduling and management',                          'core',         true,  'free',         30),
  ('module_credentials',        'Credentials',                 'Issue and verify digital credentials',                      'core',         true,  'standard',     40),

  -- Advanced modules
  ('module_wbt',                'Work-Based Training',         'Agile WBT, mentor matching and project marketplace',        'advanced',     false, 'professional', 100),
  ('module_sponsors',           'Sponsor Management',          'Sponsor onboarding, B-BBEE compliance, financial pipeline', 'advanced',     false, 'professional', 110),
  ('module_mentors',            'Mentorship',                  'Mentor portal, goal tracking and feedback',                 'advanced',     true,  'standard',     120),
  ('module_lxp',                'Learning Experience (LXP)',   'AI-powered recommendations and user-generated content',     'advanced',     false, 'professional', 130),
  ('module_gamification',       'Gamification',                'Points, badges and leaderboards',                           'advanced',     true,  'standard',     140),
  ('module_workflow_engine',    'Workflow Engine',             'Custom approval workflows and SLA tracking',                'advanced',     false, 'enterprise',   150),
  ('module_analytics',          'Advanced Analytics',          'Executive dashboard and cross-role aggregations',           'advanced',     true,  'standard',     160),

  -- Integrations
  ('integration_payments',      'Payment Gateway',             'Flutterwave / Paystack / Payfast integration',              'integrations', false, 'professional', 200),
  ('integration_jitsi',         'Jitsi Meet',                  'Built-in video conferencing for sessions',                  'integrations', true,  'standard',     210),
  ('integration_lti',           'LTI 1.3',                     'Connect external LTI tools',                                'integrations', false, 'enterprise',   220),
  ('integration_plagiarism',    'Plagiarism Detection',        'Automated originality checks',                              'integrations', false, 'professional', 230),
  ('integration_proctoring',    'Online Proctoring',           'AI-supervised assessments',                                 'integrations', false, 'enterprise',   240),

  -- Compliance
  ('compliance_popia',          'PoPIA Compliance Tools',      'DSAR workflows, consent toggles, Information Officer',      'compliance',   true,  'free',         300),
  ('compliance_bbbee',          'B-BBEE Reporting',            'HDI metrics, SD/ED beneficiary tracking',                   'compliance',   false, 'professional', 310),
  ('compliance_seta',           'SETA Reporting',              'EMP201 data, 10-point SETA compliance checklist',           'compliance',   false, 'professional', 320),

  -- Branding & Customisation
  ('branding_custom_logo',      'Custom Logo',                 'Upload custom tenant logo and favicon',                     'branding',     true,  'standard',     400),
  ('branding_custom_colors',    'Custom Brand Colors',         'Override primary/secondary colors at runtime',              'branding',     true,  'standard',     410),
  ('branding_custom_fonts',     'Custom Typography',           'Upload and inject brand fonts',                             'branding',     false, 'professional', 420),
  ('branding_custom_domain',    'Custom Domain',               'Map a vanity domain (e.g. learn.acme.com)',                 'branding',     false, 'enterprise',   430)
ON CONFLICT (flag_key) DO NOTHING;

-- 3. Helper: check if a tenant has a flag enabled (defaults to catalog default)
CREATE OR REPLACE FUNCTION public.tenant_has_flag(_tenant_id uuid, _flag_key text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT is_enabled FROM tenant_feature_flags
     WHERE tenant_id = _tenant_id AND flag_key = _flag_key),
    (SELECT default_value FROM feature_flag_catalog WHERE flag_key = _flag_key),
    true  -- if neither exists, fail-open
  )
$$;

-- 4. Helper: returns full effective flag map for a tenant (catalog ∪ overrides)
CREATE OR REPLACE FUNCTION public.get_tenant_effective_flags(_tenant_id uuid)
RETURNS TABLE(
  flag_key      text,
  display_name  text,
  description   text,
  category      text,
  min_tier      text,
  sort_order    integer,
  is_enabled    boolean,
  has_override  boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    c.flag_key,
    c.display_name,
    c.description,
    c.category,
    c.min_tier,
    c.sort_order,
    COALESCE(o.is_enabled, c.default_value) AS is_enabled,
    (o.tenant_id IS NOT NULL) AS has_override
  FROM feature_flag_catalog c
  LEFT JOIN tenant_feature_flags o
    ON o.flag_key = c.flag_key AND o.tenant_id = _tenant_id
  ORDER BY c.sort_order, c.flag_key;
$$;

-- 5. Helper: tenant quota usage (for usage meters)
CREATE OR REPLACE FUNCTION public.get_tenant_quota_usage(_tenant_id uuid)
RETURNS TABLE(
  max_users        integer,
  active_users     integer,
  max_programmes   integer,
  current_programmes integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    t.max_users,
    (SELECT COUNT(*)::int FROM tenant_users WHERE tenant_id = _tenant_id AND is_active = true),
    t.max_programmes,
    (SELECT COUNT(*)::int FROM programmes WHERE tenant_id = _tenant_id)
  FROM tenants t
  WHERE t.id = _tenant_id;
$$;

-- 6. Allow tenant admins (owner/admin) to upsert their own flags (was platform-admin only)
DROP POLICY IF EXISTS "Tenant admins can manage their own flags" ON public.tenant_feature_flags;
CREATE POLICY "Tenant admins can manage their own flags"
  ON public.tenant_feature_flags FOR ALL
  TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_admin(auth.uid(), tenant_id));

-- 7. Trigger: bootstrap default flags for newly created tenants
CREATE OR REPLACE FUNCTION public.bootstrap_tenant_feature_flags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.tenant_feature_flags (tenant_id, flag_key, is_enabled)
  SELECT NEW.id, flag_key, default_value
  FROM public.feature_flag_catalog
  ON CONFLICT (tenant_id, flag_key) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bootstrap_tenant_feature_flags ON public.tenants;
CREATE TRIGGER trg_bootstrap_tenant_feature_flags
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.bootstrap_tenant_feature_flags();

-- 8. Backfill flags for existing tenants
INSERT INTO public.tenant_feature_flags (tenant_id, flag_key, is_enabled)
SELECT t.id, c.flag_key, c.default_value
FROM public.tenants t
CROSS JOIN public.feature_flag_catalog c
ON CONFLICT (tenant_id, flag_key) DO NOTHING;

-- 9. Set sensible default quotas based on subscription_tier (only where NULL)
UPDATE public.tenants SET
  max_users      = CASE subscription_tier
                     WHEN 'free' THEN 10
                     WHEN 'standard' THEN 100
                     WHEN 'professional' THEN 500
                     WHEN 'enterprise' THEN 5000
                     ELSE 100
                   END,
  max_programmes = CASE subscription_tier
                     WHEN 'free' THEN 3
                     WHEN 'standard' THEN 25
                     WHEN 'professional' THEN 200
                     WHEN 'enterprise' THEN 2000
                     ELSE 25
                   END
WHERE max_users IS NULL OR max_programmes IS NULL;