-- Remove unscoped PM read policy — PMs don't need access to staff registration PII
-- Admins and ops retain full management access
DROP POLICY IF EXISTS "Programme managers can view staff registrations" ON public.staff_registrations;

-- Fix admin policy from {public} to {authenticated}
DROP POLICY IF EXISTS "Admins and ops manage staff registrations" ON public.staff_registrations;
CREATE POLICY "Admins and ops manage staff registrations"
  ON public.staff_registrations
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role));