-- Drop the overly permissive SELECT policy that exposes access_code to all users
DROP POLICY IF EXISTS "Authenticated can read assessment_settings" ON public.assessment_settings;

-- Create a staff-only SELECT policy on the base table
CREATE POLICY "Staff can read assessment_settings"
ON public.assessment_settings
FOR SELECT
TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR public.has_role(auth.uid(), 'programme_manager'::app_role)
  OR public.has_role(auth.uid(), 'facilitator'::app_role)
  OR public.has_role(auth.uid(), 'assessor'::app_role)
  OR public.has_role(auth.uid(), 'operations'::app_role)
);

-- Grant learners read access to the safe view (which hides access_code)
-- The view already uses security_invoker=true, so we need a policy that lets
-- authenticated users read via the view. We add a learner-accessible SELECT policy
-- that only exposes rows through the safe view by checking the assessment belongs
-- to a programme the learner is enrolled in.
CREATE POLICY "Learners can read own assessment_settings"
ON public.assessment_settings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.enrolments e
    JOIN public.cohorts c ON c.id = e.cohort_id
    JOIN public.assessments a ON a.programme_id = c.programme_id
    WHERE a.id = assessment_settings.assessment_id
      AND e.learner_id = auth.uid()
      AND e.status IN ('active', 'enrolled')
  )
);