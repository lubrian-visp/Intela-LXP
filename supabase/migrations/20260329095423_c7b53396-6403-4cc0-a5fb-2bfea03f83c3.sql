-- Create a safe view that excludes access_code for non-staff users
CREATE OR REPLACE VIEW public.assessment_settings_safe
WITH (security_invoker = true)
AS
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
  -- Only expose access_code to staff roles; learners see whether one exists (true/false)
  CASE
    WHEN public.is_platform_admin(auth.uid())
         OR public.has_role(auth.uid(), 'programme_manager'::app_role)
         OR public.has_role(auth.uid(), 'operations'::app_role)
         OR public.has_role(auth.uid(), 'facilitator'::app_role)
         OR public.has_role(auth.uid(), 'assessor'::app_role)
    THEN access_code
    ELSE NULL
  END AS access_code,
  -- Expose a boolean so learners know if a code is required
  (access_code IS NOT NULL) AS requires_access_code,
  ip_restrictions,
  created_at,
  updated_at
FROM public.assessment_settings;