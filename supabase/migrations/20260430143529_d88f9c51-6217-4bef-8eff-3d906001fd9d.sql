-- Fix 1: email_send_log — allow platform admins (super_admin, systems_admin, operations) to read send log
DROP POLICY IF EXISTS "Admins read email send log" ON public.email_send_log;
CREATE POLICY "Admins read email send log"
ON public.email_send_log
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'systems_admin'::app_role)
  OR has_role(auth.uid(), 'operations'::app_role)
);

-- Fix 2: approval_routing_rules — restrict SELECT to authenticated users only
DROP POLICY IF EXISTS "Authenticated read approval routing rules" ON public.approval_routing_rules;
CREATE POLICY "Authenticated read approval routing rules"
ON public.approval_routing_rules
FOR SELECT
TO authenticated
USING (true);

-- Fix 3: pathways — remove anonymous read access
DROP POLICY IF EXISTS "Anon read pathways" ON public.pathways;