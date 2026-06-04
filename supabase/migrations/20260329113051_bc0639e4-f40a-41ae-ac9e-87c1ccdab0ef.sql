-- FIX 1: Remove blanket "Authenticated read role permissions" policy
-- The scoped policy "Admins and assigned users can view role_permissions" already exists
-- and properly restricts reads to admins and users with matching role scopes.
DROP POLICY IF EXISTS "Authenticated read role permissions" ON public.role_permissions;

-- Also fix "Admins manage role permissions" which uses {public} role instead of {authenticated}
DROP POLICY IF EXISTS "Admins manage role permissions" ON public.role_permissions;
CREATE POLICY "Admins manage role permissions"
  ON public.role_permissions
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- FIX 2: Restrict assessment_settings base table SELECT to platform admins only
-- Facilitators and PMs will use assessment_settings_safe view (which strips access_code)
DROP POLICY IF EXISTS "Staff can read assessment_settings" ON public.assessment_settings;

CREATE POLICY "Admins can read assessment_settings"
  ON public.assessment_settings
  FOR SELECT
  TO authenticated
  USING (is_platform_admin(auth.uid()));

-- Replace "Staff can manage assessment_settings" ALL policy with write-only for staff
-- (ALL includes SELECT which we want to restrict)
DROP POLICY IF EXISTS "Staff can manage assessment_settings" ON public.assessment_settings;

CREATE POLICY "Staff can write assessment_settings"
  ON public.assessment_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role));

CREATE POLICY "Staff can update assessment_settings"
  ON public.assessment_settings
  FOR UPDATE
  TO authenticated
  USING (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role))
  WITH CHECK (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role));

CREATE POLICY "Staff can delete assessment_settings"
  ON public.assessment_settings
  FOR DELETE
  TO authenticated
  USING (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role));