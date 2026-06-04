
-- Re-add staff SELECT on profiles but ONLY for non-sensitive columns
-- by using a security barrier view approach at the table level.
-- Since RLS cannot restrict columns, we re-add the policy to avoid breaking
-- existing code, but revoke column-level access to phone and organisation.

-- Re-add staff read policy (needed by existing app code)
CREATE POLICY "Staff can view profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'facilitator'::app_role)
    OR has_role(auth.uid(), 'assessor'::app_role)
    OR has_role(auth.uid(), 'moderator'::app_role)
    OR has_role(auth.uid(), 'mentor'::app_role)
    OR has_role(auth.uid(), 'programme_manager'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
    OR has_role(auth.uid(), 'talent_manager'::app_role)
    OR has_role(auth.uid(), 'systems_admin'::app_role)
  );

-- Revoke blanket SELECT on profiles from authenticated, then re-grant only non-sensitive columns
-- This ensures phone and organisation columns are not readable even with RLS row access
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, user_id, full_name, avatar_url, email, job_title, department, location, status, verified_at, created_at, updated_at) ON public.profiles TO authenticated;
