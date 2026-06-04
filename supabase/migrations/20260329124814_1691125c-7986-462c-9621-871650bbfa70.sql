
-- Tighten assessor read: only submissions directly assigned OR in programmes 
-- where the assessor is assigned to a cohort
DROP POLICY IF EXISTS "Assessors read submissions" ON public.assessment_submissions;
CREATE POLICY "Assessors read submissions" ON public.assessment_submissions
  FOR SELECT TO authenticated
  USING (
    assessor_id = auth.uid()
    OR (
      has_role(auth.uid(), 'assessor'::app_role)
      AND EXISTS (
        SELECT 1 FROM assessments a
        JOIN cohorts c ON c.programme_id = a.programme_id
        JOIN cohort_staff_assignments csa ON csa.cohort_id = c.id
        WHERE a.id = assessment_submissions.assessment_id
          AND csa.user_id = auth.uid()
      )
    )
  );

-- Tighten moderator read: only submissions directly assigned OR in programmes
-- where the moderator is assigned to a cohort
DROP POLICY IF EXISTS "Moderators read submissions" ON public.assessment_submissions;
CREATE POLICY "Moderators read submissions" ON public.assessment_submissions
  FOR SELECT TO authenticated
  USING (
    moderator_id = auth.uid()
    OR (
      has_role(auth.uid(), 'moderator'::app_role)
      AND EXISTS (
        SELECT 1 FROM assessments a
        JOIN cohorts c ON c.programme_id = a.programme_id
        JOIN cohort_staff_assignments csa ON csa.cohort_id = c.id
        WHERE a.id = assessment_submissions.assessment_id
          AND csa.user_id = auth.uid()
      )
    )
  );
