CREATE OR REPLACE VIEW public.unified_audit_log AS
SELECT
  id::text AS id,
  'onboarding'::text AS source,
  entity_type,
  entity_id::text AS entity_id,
  action,
  performed_by::text AS user_id,
  details,
  created_at
FROM public.onboarding_audit_log

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
FROM public.deletion_audit_log

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
FROM public.programme_lifecycle_audit;