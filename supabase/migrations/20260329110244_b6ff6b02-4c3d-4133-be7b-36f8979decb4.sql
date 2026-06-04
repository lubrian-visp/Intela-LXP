-- Remove the broad SELECT policy that allows assessors/operations to read the base table (including access_code)
DROP POLICY IF EXISTS "Staff can read assessment_settings" ON public.assessment_settings;

-- Recreate SELECT policy restricted to only admins and programme managers (no assessors/operations on base table)
CREATE POLICY "Staff can read assessment_settings"
ON public.assessment_settings
FOR SELECT
TO authenticated
USING (
  is_platform_admin(auth.uid())
  OR has_role(auth.uid(), 'programme_manager'::app_role)
  OR has_role(auth.uid(), 'facilitator'::app_role)
);

-- Ensure assessors/operations access settings via the safe view only
GRANT SELECT ON public.assessment_settings_safe TO authenticated;