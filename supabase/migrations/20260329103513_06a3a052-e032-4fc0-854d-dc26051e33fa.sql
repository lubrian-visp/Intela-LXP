
-- Drop the overly permissive read policy on cohort_staff_assignments
DROP POLICY IF EXISTS "Authenticated users can read cohort staff assignments" ON public.cohort_staff_assignments;

-- Allow users to read assignments where they are the assigned staff member
CREATE POLICY "Users can read own cohort staff assignments"
ON public.cohort_staff_assignments
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow platform admins and operations to read all assignments
CREATE POLICY "Admins can read all cohort staff assignments"
ON public.cohort_staff_assignments
FOR SELECT
TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR public.has_role(auth.uid(), 'operations'::app_role)
  OR public.has_role(auth.uid(), 'programme_manager'::app_role)
  OR public.has_role(auth.uid(), 'facilitator'::app_role)
);
