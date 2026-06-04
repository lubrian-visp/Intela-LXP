-- Fix 1: Restrict payment_routing_rules read access to admin/ops/finance roles only
DROP POLICY IF EXISTS "Authenticated users read routing rules" ON public.payment_routing_rules;

CREATE POLICY "Admin and ops read routing rules"
ON public.payment_routing_rules
FOR SELECT
TO authenticated
USING (
  is_platform_admin(auth.uid())
  OR has_role(auth.uid(), 'operations'::app_role)
);

-- Fix 2: Recreate unified_audit_log view with security_invoker so it inherits source table RLS
DROP VIEW IF EXISTS public.unified_audit_log;

CREATE OR REPLACE VIEW public.unified_audit_log
WITH (security_invoker = true)
AS
SELECT
  id::text AS id,
  'onboarding'::text AS source,
  entity_type,
  entity_id::text AS entity_id,
  action,
  performed_by::text AS user_id,
  details,
  created_at
FROM onboarding_audit_log
UNION ALL
SELECT
  id::text AS id,
  'deletion'::text AS source,
  entity_type,
  entity_id::text AS entity_id,
  action_type AS action,
  user_id::text AS user_id,
  details,
  created_at
FROM deletion_audit_log
UNION ALL
SELECT
  id::text AS id,
  'programme_lifecycle'::text AS source,
  'programme'::text AS entity_type,
  programme_id::text AS entity_id,
  action,
  performed_by::text AS user_id,
  jsonb_build_object(
    'previous_status', previous_status,
    'new_status', new_status,
    'reason', reason,
    'role_at_action', role_at_action,
    'metadata', metadata
  ) AS details,
  created_at
FROM programme_lifecycle_audit;