-- Recreate assessment_settings_safe with SECURITY INVOKER so it inherits base table RLS
CREATE OR REPLACE VIEW public.assessment_settings_safe
WITH (security_barrier = true, security_invoker = true) AS
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
FROM assessment_settings;

-- Drop the overly broad anon SELECT policy on issued_credentials
DROP POLICY IF EXISTS "Public can verify credentials" ON public.issued_credentials;

-- Create a verification-safe view exposing only minimal columns for anonymous verification
CREATE OR REPLACE VIEW public.credential_verification_safe
WITH (security_barrier = true) AS
SELECT
  blockchain_hash,
  verification_url,
  title,
  credential_type,
  status,
  issued_at
FROM public.issued_credentials
WHERE status = 'active';

-- Grant anon and authenticated access to the safe verification view
GRANT SELECT ON public.credential_verification_safe TO anon;
GRANT SELECT ON public.credential_verification_safe TO authenticated;