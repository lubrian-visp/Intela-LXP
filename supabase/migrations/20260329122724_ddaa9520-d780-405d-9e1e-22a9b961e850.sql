-- Drop and recreate assessment_settings_safe without ip_restrictions
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
  created_at,
  updated_at
FROM public.assessment_settings;