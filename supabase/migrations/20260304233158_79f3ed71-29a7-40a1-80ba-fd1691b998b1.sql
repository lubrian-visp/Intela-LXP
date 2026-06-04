-- Drop the existing restrictive SELECT policy on programmes
DROP POLICY IF EXISTS "Authenticated read programmes" ON public.programmes;

-- Recreate with broader access: learners can see programmes they're enrolled in
CREATE POLICY "Authenticated read programmes" ON public.programmes
FOR SELECT TO authenticated
USING (
  -- Programmes with active/published status visible to all authenticated
  status IN ('active', 'published', 'approved')
  -- Admin/staff roles see all
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'programme_manager'::app_role)
  OR has_role(auth.uid(), 'operations'::app_role)
  OR has_role(auth.uid(), 'systems_admin'::app_role)
  OR has_role(auth.uid(), 'facilitator'::app_role)
  OR has_role(auth.uid(), 'assessor'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
  -- Learners can see programmes they're enrolled in (any status)
  OR EXISTS (
    SELECT 1 FROM public.enrolments e
    JOIN public.cohorts c ON c.id = e.cohort_id
    WHERE c.programme_id = programmes.id
    AND e.learner_id = auth.uid()
  )
);