
-- 1. deletion_audit_log: scope INSERT so user_id matches the caller
DROP POLICY IF EXISTS "Authenticated insert deletion audit logs" ON public.deletion_audit_log;

CREATE POLICY "Authenticated insert deletion audit logs"
ON public.deletion_audit_log FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 2. workflow_audit_log: scope INSERT so performed_by matches the caller
DROP POLICY IF EXISTS "Insert workflow_audit_log" ON public.workflow_audit_log;

CREATE POLICY "Insert workflow_audit_log"
ON public.workflow_audit_log FOR INSERT
TO authenticated
WITH CHECK (performed_by = auth.uid());
