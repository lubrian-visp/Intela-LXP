
-- =============================================
-- FIX 1: Scope staff SELECT on profiles table
-- =============================================
-- Replace the broad "Staff can view profiles" policy with a scoped version
-- that only allows staff to see profiles of users they are associated with
-- (via cohort assignments, enrolments, or programme ownership).

DROP POLICY IF EXISTS "Staff can view profiles" ON public.profiles;

CREATE POLICY "Staff can view scoped profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    -- Facilitators, Assessors, Moderators, Mentors: see profiles in their assigned cohorts
    (
      (
        has_role(auth.uid(), 'facilitator'::app_role)
        OR has_role(auth.uid(), 'assessor'::app_role)
        OR has_role(auth.uid(), 'moderator'::app_role)
        OR has_role(auth.uid(), 'mentor'::app_role)
      )
      AND (
        -- Learners enrolled in cohorts this staff member is assigned to
        EXISTS (
          SELECT 1 FROM cohort_staff_assignments csa
          JOIN enrolments e ON e.cohort_id = csa.cohort_id
          WHERE csa.user_id = auth.uid() AND e.learner_id = profiles.user_id
        )
        -- Or the profile belongs to a cohort facilitator they share a cohort with
        OR EXISTS (
          SELECT 1 FROM cohort_staff_assignments csa
          WHERE csa.user_id = auth.uid() AND csa.cohort_id IN (
            SELECT csa2.cohort_id FROM cohort_staff_assignments csa2 WHERE csa2.user_id = profiles.user_id
          )
        )
      )
    )
    -- Programme Managers: see profiles of users in their programmes
    OR (
      has_role(auth.uid(), 'programme_manager'::app_role)
      AND (
        EXISTS (
          SELECT 1 FROM programmes p
          JOIN cohorts c ON c.programme_id = p.id
          JOIN enrolments e ON e.cohort_id = c.id
          WHERE p.created_by = auth.uid() AND e.learner_id = profiles.user_id
        )
        OR EXISTS (
          SELECT 1 FROM programmes p
          JOIN cohorts c ON c.programme_id = p.id
          JOIN cohort_staff_assignments csa ON csa.cohort_id = c.id
          WHERE p.created_by = auth.uid() AND csa.user_id = profiles.user_id
        )
      )
    )
    -- Operations, Talent Manager, Systems Admin: full staff access (operational need)
    OR has_role(auth.uid(), 'operations'::app_role)
    OR has_role(auth.uid(), 'talent_manager'::app_role)
    OR has_role(auth.uid(), 'systems_admin'::app_role)
  );

-- =============================================
-- FIX 2: Scope curriculum-uploads storage policies
-- =============================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Users read own curriculum uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own curriculum uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users upload curriculum" ON storage.objects;

-- SELECT: Staff roles can read all curriculum files; learners can only read files in their own folder
CREATE POLICY "Staff read curriculum uploads" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'curriculum-uploads'
    AND (
      has_role(auth.uid(), 'super_admin'::app_role)
      OR has_role(auth.uid(), 'systems_admin'::app_role)
      OR has_role(auth.uid(), 'programme_manager'::app_role)
      OR has_role(auth.uid(), 'facilitator'::app_role)
      OR has_role(auth.uid(), 'operations'::app_role)
      OR has_role(auth.uid(), 'assessor'::app_role)
      OR has_role(auth.uid(), 'moderator'::app_role)
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- INSERT: Only staff roles can upload curriculum content
CREATE POLICY "Staff upload curriculum files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'curriculum-uploads'
    AND (
      has_role(auth.uid(), 'super_admin'::app_role)
      OR has_role(auth.uid(), 'systems_admin'::app_role)
      OR has_role(auth.uid(), 'programme_manager'::app_role)
      OR has_role(auth.uid(), 'facilitator'::app_role)
      OR has_role(auth.uid(), 'operations'::app_role)
    )
  );

-- DELETE: Only staff roles or the original uploader can delete
CREATE POLICY "Staff or owner delete curriculum uploads" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'curriculum-uploads'
    AND (
      has_role(auth.uid(), 'super_admin'::app_role)
      OR has_role(auth.uid(), 'systems_admin'::app_role)
      OR has_role(auth.uid(), 'programme_manager'::app_role)
      OR has_role(auth.uid(), 'operations'::app_role)
      OR owner = auth.uid()
    )
  );
