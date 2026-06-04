
-- Fix the ALL policy to include operations and systems_admin roles
DROP POLICY IF EXISTS "Admins full access programmes" ON public.programmes;

CREATE POLICY "Admins full access programmes"
ON public.programmes
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'programme_manager'::app_role)
  OR has_role(auth.uid(), 'operations'::app_role)
  OR has_role(auth.uid(), 'systems_admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'programme_manager'::app_role)
  OR has_role(auth.uid(), 'operations'::app_role)
  OR has_role(auth.uid(), 'systems_admin'::app_role)
);
