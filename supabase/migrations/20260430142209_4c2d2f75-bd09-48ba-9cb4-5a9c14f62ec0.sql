DROP POLICY IF EXISTS "Authenticated read enrolment toggles" ON public.enrolment_toggles;

CREATE POLICY "Authenticated read enrolment toggles"
ON public.enrolment_toggles
FOR SELECT
TO authenticated
USING (true);