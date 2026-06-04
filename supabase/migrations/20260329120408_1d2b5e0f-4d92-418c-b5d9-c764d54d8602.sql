-- FIX 1: Remove blanket "Authenticated read role definitions" policy
-- The scoped policy "Admins and assigned users can view role_definitions" already exists
DROP POLICY IF EXISTS "Authenticated read role definitions" ON public.role_definitions;

-- FIX 2: Fix "Admins manage role definitions" which uses {public} role instead of {authenticated}
DROP POLICY IF EXISTS "Admins manage role definitions" ON public.role_definitions;
CREATE POLICY "Admins manage role definitions"
  ON public.role_definitions
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));