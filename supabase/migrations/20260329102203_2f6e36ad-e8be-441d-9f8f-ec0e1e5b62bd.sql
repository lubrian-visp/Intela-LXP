
-- 1. Drop the learner SELECT policy on the base assessment_settings table
-- This prevents learners from directly querying the base table and seeing access_code
DROP POLICY IF EXISTS "Learners can read own assessment_settings" ON public.assessment_settings;

-- 2. Recreate the safe view WITHOUT security_invoker so it can read the base table
-- using the view owner's privileges (bypassing RLS), while still masking access_code
DROP VIEW IF EXISTS public.assessment_settings_safe;

CREATE VIEW public.assessment_settings_safe
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
  CASE
    WHEN is_platform_admin(auth.uid())
      OR has_role(auth.uid(), 'programme_manager'::app_role)
      OR has_role(auth.uid(), 'operations'::app_role)
      OR has_role(auth.uid(), 'facilitator'::app_role)
      OR has_role(auth.uid(), 'assessor'::app_role)
    THEN s.access_code
    ELSE NULL
  END AS access_code,
  s.access_code IS NOT NULL AS requires_access_code,
  s.ip_restrictions,
  s.created_at,
  s.updated_at
FROM public.assessment_settings s;

-- 3. Grant SELECT on the safe view to authenticated users
GRANT SELECT ON public.assessment_settings_safe TO authenticated;

-- 4. Revoke direct SELECT on base table from anon (just in case)
REVOKE SELECT ON public.assessment_settings FROM anon;
