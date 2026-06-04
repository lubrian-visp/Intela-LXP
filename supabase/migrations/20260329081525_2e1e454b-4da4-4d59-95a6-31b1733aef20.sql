
-- 1. Fix meeting_participants: drop public/anon policy, recreate for authenticated only
DROP POLICY IF EXISTS "Authenticated read session participants" ON public.meeting_participants;

CREATE POLICY "Authenticated read session participants"
ON public.meeting_participants FOR SELECT
TO authenticated
USING (true);

-- 2. Fix platform_settings: restrict to admin roles only
DROP POLICY IF EXISTS "Authenticated read platform settings" ON public.platform_settings;

CREATE POLICY "Admins can read platform settings"
ON public.platform_settings FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'systems_admin'::app_role)
  OR has_role(auth.uid(), 'operations'::app_role)
);

-- 3. Fix staff_role_assignments: drop overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can read staff role assignments" ON public.staff_role_assignments;
