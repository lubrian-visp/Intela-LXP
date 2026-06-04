
-- ═══════════════════════════════════════════════════════════════
-- ROLE DEFINITIONS: metadata for both predefined and custom roles
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.role_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key TEXT NOT NULL UNIQUE, -- e.g. 'assessor', 'custom_mentor_v2'
  display_name TEXT NOT NULL,
  description TEXT,
  domain TEXT NOT NULL CHECK (domain IN ('technical', 'business', 'learning_development')),
  base_role app_role, -- NULL for fully freeform roles; set when cloned from predefined
  is_predefined BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  template_source_id UUID REFERENCES public.role_definitions(id),
  dashboard_path TEXT, -- default dashboard route
  portal_title TEXT,
  portal_subtitle TEXT,
  menu_config JSONB DEFAULT '[]'::jsonb, -- custom nav items
  widget_config JSONB DEFAULT '[]'::jsonb, -- dashboard widget definitions
  permissions JSONB DEFAULT '{}'::jsonb, -- permission matrix
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.role_definitions ENABLE ROW LEVEL SECURITY;

-- Admins manage role definitions
CREATE POLICY "Admins manage role definitions"
ON public.role_definitions FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Everyone can read active role definitions
CREATE POLICY "Authenticated read role definitions"
ON public.role_definitions FOR SELECT
USING (true);

-- ═══════════════════════════════════════════════════════════════
-- ROLE PERMISSIONS: granular permission entries per role
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_definition_id UUID NOT NULL REFERENCES public.role_definitions(id) ON DELETE CASCADE,
  resource TEXT NOT NULL, -- e.g. 'programmes', 'assessments', 'cohorts'
  action TEXT NOT NULL,   -- e.g. 'read', 'create', 'update', 'delete', 'manage'
  is_granted BOOLEAN NOT NULL DEFAULT true,
  conditions JSONB DEFAULT '{}'::jsonb, -- ABAC conditions
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role_definition_id, resource, action)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage role permissions"
ON public.role_permissions FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Authenticated read role permissions"
ON public.role_permissions FOR SELECT
USING (true);

-- ═══════════════════════════════════════════════════════════════
-- USER ROLE SCOPES: ABAC scoping for role assignments
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.user_role_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role_definition_id UUID NOT NULL REFERENCES public.role_definitions(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('programme', 'cohort', 'region', 'department', 'global')),
  scope_value UUID, -- references programme_id, cohort_id, etc. NULL for 'global'
  scope_label TEXT, -- human-readable label
  assigned_by UUID,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role_definition_id, scope_type, scope_value)
);

ALTER TABLE public.user_role_scopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage user role scopes"
ON public.user_role_scopes FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role));

CREATE POLICY "Users see own scopes"
ON public.user_role_scopes FOR SELECT
USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════
-- ROLE AUDIT LOG: tracks all role-related changes
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.role_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL, -- 'role_created', 'role_updated', 'role_deactivated', 'user_assigned', 'user_removed', 'permissions_changed'
  entity_type TEXT NOT NULL, -- 'role_definition', 'user_role', 'role_permission', 'user_role_scope'
  entity_id UUID NOT NULL,
  performed_by UUID,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.role_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read role audit log"
ON public.role_audit_log FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role));

CREATE POLICY "System insert role audit log"
ON public.role_audit_log FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_role_definitions_updated_at
BEFORE UPDATE ON public.role_definitions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_role_permissions_updated_at
BEFORE UPDATE ON public.role_permissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_role_scopes_updated_at
BEFORE UPDATE ON public.user_role_scopes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- SEED predefined roles into role_definitions
-- ═══════════════════════════════════════════════════════════════
INSERT INTO public.role_definitions (role_key, display_name, description, domain, base_role, is_predefined, dashboard_path, portal_title, portal_subtitle, permissions) VALUES
  ('super_admin', 'Super Admin', 'Full platform access and configuration', 'technical', 'super_admin', true, '/', 'TECHNICAL PORTAL', 'Platform Administration', '{"programmes":"manage","users":"manage","settings":"manage","audit":"manage","tenants":"manage"}'::jsonb),
  ('systems_admin', 'Systems Administrator', 'Infrastructure and system health monitoring', 'technical', 'systems_admin', true, '/systems-admin', 'TECHNICAL PORTAL', 'Platform Administration', '{"system_health":"manage","integrations":"manage","logs":"read","users":"read"}'::jsonb),
  ('programme_manager', 'Programme Manager', 'Programme creation, delivery and oversight', 'business', 'programme_manager', true, '/programme-manager', 'BUSINESS PORTAL', 'Operations & Management', '{"programmes":"manage","cohorts":"manage","assessments":"manage","pathways":"manage","credentials":"manage","analytics":"read"}'::jsonb),
  ('operations', 'Operations', 'Day-to-day operational management', 'business', 'operations', true, '/operations', 'BUSINESS PORTAL', 'Operations & Management', '{"programmes":"read","cohorts":"manage","onboarding":"manage","analytics":"read","approvals":"manage"}'::jsonb),
  ('talent_manager', 'Talent Manager', 'Talent pipeline and workforce development', 'business', 'talent_manager', true, '/talent-manager', 'BUSINESS PORTAL', 'Operations & Management', '{"talent":"manage","analytics":"read","credentials":"read"}'::jsonb),
  ('sponsor', 'Sponsor', 'Funding oversight and learner sponsorship', 'business', 'sponsor', true, '/sponsor-portal', 'SPONSOR PORTAL', 'Investment & Oversight', '{"sponsor_dashboard":"read","funded_learners":"read","reports":"read"}'::jsonb),
  ('facilitator', 'Facilitator', 'Teaching, facilitation and learner support', 'learning_development', 'facilitator', true, '/facilitator', 'FACILITATOR PORTAL', 'Teaching & Facilitation', '{"cohorts":"read","learner_progress":"read","sessions":"manage","modules":"read","assessments":"read"}'::jsonb),
  ('assessor', 'Assessor', 'Assessment grading and portfolio review', 'learning_development', 'assessor', true, '/assessor', 'ASSESSOR PORTAL', 'Assessment & Grading', '{"assessment_queue":"manage","grading":"manage","poe_review":"manage","history":"read"}'::jsonb),
  ('moderator', 'Moderator', 'Quality assurance and moderation', 'learning_development', 'moderator', true, '/moderator', 'MODERATOR PORTAL', 'Quality Assurance', '{"moderation_queue":"manage","qa_reports":"manage","poe_moderation":"manage"}'::jsonb),
  ('mentor', 'Mentor', 'Learner guidance and evidence validation', 'learning_development', 'mentor', true, '/mentor', 'MENTOR PORTAL', 'Guidance & Support', '{"mentees":"manage","evidence_validation":"manage","endorsements":"manage","sessions":"read"}'::jsonb),
  ('learner', 'Learner', 'Learning journey and programme participation', 'learning_development', 'learner', true, '/learner', 'LEARNER PORTAL', 'My Learning Journey', '{"my_programmes":"read","my_assessments":"read","portfolio":"manage","sessions":"read","credentials":"read"}'::jsonb);
