DROP POLICY IF EXISTS "Assessors can read enrolments" ON public.enrolments;
DROP POLICY IF EXISTS "Moderators can read enrolments" ON public.enrolments;
DROP POLICY IF EXISTS "Talent managers can read enrolments" ON public.enrolments;

CREATE POLICY "Assessors can read assigned enrolments"
ON public.enrolments FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'assessor'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.cohort_staff_assignments csa
    WHERE csa.cohort_id = enrolments.cohort_id
      AND csa.user_id = auth.uid()
  )
);

CREATE POLICY "Moderators can read assigned enrolments"
ON public.enrolments FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'moderator'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.cohort_staff_assignments csa
    WHERE csa.cohort_id = enrolments.cohort_id
      AND csa.user_id = auth.uid()
  )
);

CREATE POLICY "Talent managers can read assigned enrolments"
ON public.enrolments FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'talent_manager'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.cohort_staff_assignments csa
    WHERE csa.cohort_id = enrolments.cohort_id
      AND csa.user_id = auth.uid()
  )
);