-- Drop the overly permissive SELECT policy on system_settings
DROP POLICY IF EXISTS "Authenticated can read settings" ON public.system_settings;

-- Create an admin-only SELECT policy
CREATE POLICY "Admins can read system_settings"
ON public.system_settings
FOR SELECT
TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR public.has_role(auth.uid(), 'operations'::app_role)
);