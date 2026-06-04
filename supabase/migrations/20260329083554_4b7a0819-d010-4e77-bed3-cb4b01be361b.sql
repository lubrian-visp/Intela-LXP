
-- 1. Fix role_definitions: change policy from public to authenticated
DROP POLICY IF EXISTS "Authenticated read role definitions" ON public.role_definitions;
CREATE POLICY "Authenticated read role definitions"
ON public.role_definitions FOR SELECT
TO authenticated
USING (true);

-- 2. Fix role_permissions: change policy from public to authenticated
DROP POLICY IF EXISTS "Authenticated read role permissions" ON public.role_permissions;
CREATE POLICY "Authenticated read role permissions"
ON public.role_permissions FOR SELECT
TO authenticated
USING (true);

-- 3. Fix notifications: restrict INSERT so user_id must match auth.uid() for regular users,
--    but allow staff roles to create notifications for other users (system notifications)
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;

CREATE POLICY "Users insert own notifications or staff notify others"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'systems_admin'::app_role)
  OR has_role(auth.uid(), 'operations'::app_role)
  OR has_role(auth.uid(), 'facilitator'::app_role)
  OR has_role(auth.uid(), 'programme_manager'::app_role)
);
