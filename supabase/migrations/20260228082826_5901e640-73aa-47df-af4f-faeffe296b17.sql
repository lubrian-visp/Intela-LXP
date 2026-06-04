-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Staff can read active programmes" ON public.programmes;

-- Create a broader SELECT policy: 
-- All authenticated users can read published/active programmes
-- Staff roles can read all programmes regardless of status
CREATE POLICY "Authenticated read programmes"
ON public.programmes
FOR SELECT
TO authenticated
USING (
  status IN ('active', 'published')
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'programme_manager'::app_role)
  OR has_role(auth.uid(), 'operations'::app_role)
  OR has_role(auth.uid(), 'systems_admin'::app_role)
  OR has_role(auth.uid(), 'facilitator'::app_role)
  OR has_role(auth.uid(), 'assessor'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);