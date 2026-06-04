CREATE POLICY "Sponsors can read sponsored programmes"
ON public.programmes
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.cohorts c
    JOIN public.enrolments e ON e.cohort_id = c.id
    WHERE c.programme_id = programmes.id
      AND e.sponsor_id = auth.uid()
  )
);