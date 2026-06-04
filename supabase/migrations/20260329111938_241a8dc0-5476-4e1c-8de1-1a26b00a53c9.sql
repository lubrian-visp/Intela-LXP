
-- FIX: Remove learner SELECT policy from base assessment_settings table
-- to prevent direct access_code exposure via PostgREST.
-- Learners must use the assessment_settings_safe view instead.

-- 1. Drop the learner policy that exposes access_code on the base table
DROP POLICY IF EXISTS "Enrolled learners can read assessment_settings" ON public.assessment_settings;

-- 2. Recreate assessment_settings_safe as SECURITY DEFINER view
--    This allows learners to read through the view (which excludes access_code)
--    without needing a SELECT policy on the base table.
DROP VIEW IF EXISTS public.assessment_settings_safe;
CREATE VIEW public.assessment_settings_safe WITH (security_barrier = true) AS
  SELECT
    id,
    assessment_id,
    time_limit_minutes,
    attempts_allowed,
    availability_start,
    availability_end,
    display_mode,
    allow_backtracking,
    show_question_flagging,
    feedback_release,
    randomise_questions,
    randomise_options,
    show_correct_answers,
    require_lockdown_browser,
    (access_code IS NOT NULL) AS requires_access_code,
    ip_restrictions,
    created_at,
    updated_at
  FROM public.assessment_settings;

GRANT SELECT ON public.assessment_settings_safe TO authenticated;

-- 3. Revoke direct SELECT on base table from anon (ensure only staff policies apply)
REVOKE SELECT ON public.assessment_settings FROM anon;
