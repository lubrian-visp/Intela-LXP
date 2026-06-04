-- 1. Quiz options: create a safe view that masks is_correct for learners taking quizzes
-- Add a learner-facing SELECT policy that only exposes options without is_correct via a safe view

-- Create safe view for learners (excludes is_correct)
CREATE OR REPLACE VIEW public.quiz_options_safe
WITH (security_invoker = true) AS
SELECT
  id,
  question_id,
  option_text,
  sequence_order,
  created_at
FROM public.quiz_options;

-- Allow authenticated users to read the safe view
GRANT SELECT ON public.quiz_options_safe TO authenticated;

-- Add a learner SELECT policy on quiz_options that masks is_correct via row-level filter
-- We add a policy so authenticated learners can read the rows (without is_correct, they must use the view)
CREATE POLICY "Learners read quiz_options without answers via view"
ON public.quiz_options
FOR SELECT
TO authenticated
USING (
  -- Only allow direct table read for staff; learners must use the safe view
  is_platform_admin(auth.uid())
  OR has_role(auth.uid(), 'programme_manager'::app_role)
  OR has_role(auth.uid(), 'facilitator'::app_role)
  OR has_role(auth.uid(), 'assessor'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);

-- Revoke direct column SELECT on is_correct from authenticated; staff still get it because policy + grant on table
-- Actually since RLS already restricts the table to staff, learners cannot read it at all currently.
-- Provide quiz_options_safe so learners can fetch options without is_correct.

-- 2. Transactional outbox: add explicit service_role policies
CREATE POLICY "Service role can insert outbox events"
ON public.transactional_outbox
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update outbox events"
ON public.transactional_outbox
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can read outbox events"
ON public.transactional_outbox
FOR SELECT
TO service_role
USING (true);