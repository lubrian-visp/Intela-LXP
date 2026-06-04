
-- 1. Fix sponsor_invitations: restrict SELECT to admins and the invited party
DROP POLICY IF EXISTS "Authenticated read invitations" ON public.sponsor_invitations;

CREATE POLICY "Admins and invited party can read invitations"
ON public.sponsor_invitations FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'systems_admin'::app_role)
  OR has_role(auth.uid(), 'operations'::app_role)
  OR has_role(auth.uid(), 'programme_manager'::app_role)
  OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- 2. Fix unified_audit_log: recreate as SECURITY INVOKER view
DROP VIEW IF EXISTS public.unified_audit_log;

CREATE VIEW public.unified_audit_log
WITH (security_invoker = true)
AS
SELECT (onboarding_audit_log.id)::text AS id,
    'onboarding'::text AS source,
    onboarding_audit_log.entity_type,
    (onboarding_audit_log.entity_id)::text AS entity_id,
    onboarding_audit_log.action,
    (onboarding_audit_log.performed_by)::text AS user_id,
    onboarding_audit_log.details,
    onboarding_audit_log.created_at
   FROM onboarding_audit_log
UNION ALL
 SELECT (deletion_audit_log.id)::text AS id,
    'deletion'::text AS source,
    deletion_audit_log.entity_type,
    (deletion_audit_log.entity_id)::text AS entity_id,
    deletion_audit_log.action_type AS action,
    (deletion_audit_log.user_id)::text AS user_id,
    deletion_audit_log.details,
    deletion_audit_log.created_at
   FROM deletion_audit_log
UNION ALL
 SELECT (programme_lifecycle_audit.id)::text AS id,
    'programme_lifecycle'::text AS source,
    'programme'::text AS entity_type,
    (programme_lifecycle_audit.programme_id)::text AS entity_id,
    programme_lifecycle_audit.action,
    (programme_lifecycle_audit.performed_by)::text AS user_id,
    jsonb_build_object('previous_status', programme_lifecycle_audit.previous_status, 'new_status', programme_lifecycle_audit.new_status, 'reason', programme_lifecycle_audit.reason, 'role_at_action', programme_lifecycle_audit.role_at_action, 'metadata', programme_lifecycle_audit.metadata) AS details,
    programme_lifecycle_audit.created_at
   FROM programme_lifecycle_audit;
