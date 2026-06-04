
-- 1. Recreate assessment_settings_safe WITHOUT access_code column entirely
DROP VIEW IF EXISTS public.assessment_settings_safe;
CREATE OR REPLACE VIEW public.assessment_settings_safe
WITH (security_invoker = false)
AS
SELECT
  s.id,
  s.assessment_id,
  s.time_limit_minutes,
  s.attempts_allowed,
  s.availability_start,
  s.availability_end,
  s.display_mode,
  s.allow_backtracking,
  s.show_question_flagging,
  s.feedback_release,
  s.randomise_questions,
  s.randomise_options,
  s.show_correct_answers,
  s.require_lockdown_browser,
  (s.access_code IS NOT NULL) AS requires_access_code,
  s.ip_restrictions,
  s.created_at,
  s.updated_at
FROM public.assessment_settings s;

GRANT SELECT ON public.assessment_settings_safe TO authenticated;
REVOKE SELECT ON public.assessment_settings_safe FROM anon;

-- 2. Recreate unified_audit_log as security definer with admin-only access check
DROP VIEW IF EXISTS public.unified_audit_log;
CREATE OR REPLACE VIEW public.unified_audit_log
WITH (security_invoker = false)
AS
SELECT
  id::text,
  'onboarding'::text AS source,
  entity_type,
  entity_id::text,
  action,
  performed_by::text AS user_id,
  details,
  created_at
FROM public.onboarding_audit_log
WHERE public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'operations'::app_role)

UNION ALL

SELECT
  id::text,
  'deletion'::text AS source,
  entity_type,
  entity_id::text,
  action_type AS action,
  user_id::text,
  details,
  created_at
FROM public.deletion_audit_log
WHERE public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'operations'::app_role)

UNION ALL

SELECT
  id::text,
  'programme_lifecycle'::text AS source,
  'programme'::text AS entity_type,
  programme_id::text AS entity_id,
  action,
  performed_by::text AS user_id,
  jsonb_build_object(
    'previous_status', previous_status,
    'new_status', new_status,
    'reason', reason,
    'role_at_action', role_at_action,
    'metadata', metadata
  ) AS details,
  created_at
FROM public.programme_lifecycle_audit
WHERE public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'operations'::app_role);

GRANT SELECT ON public.unified_audit_log TO authenticated;
REVOKE SELECT ON public.unified_audit_log FROM anon;

-- 3. Fix profiles: change "Staff can view all profiles" from {public} to {authenticated}
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;
CREATE POLICY "Staff can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'facilitator'::app_role)
  OR public.has_role(auth.uid(), 'assessor'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
  OR public.has_role(auth.uid(), 'mentor'::app_role)
  OR public.has_role(auth.uid(), 'programme_manager'::app_role)
  OR public.has_role(auth.uid(), 'operations'::app_role)
  OR public.has_role(auth.uid(), 'talent_manager'::app_role)
  OR public.has_role(auth.uid(), 'systems_admin'::app_role)
);
