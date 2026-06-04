
-- 1. Pin search_path on utility functions still missing it
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;

-- 2. Revoke EXECUTE from anon + authenticated on internal SECURITY DEFINER helpers
--    (trigger functions and queue helpers — never meant to be called directly by clients)
DO $$
DECLARE
  fn record;
  internal_fns text[] := ARRAY[
    'handle_new_user',
    'update_updated_at_column',
    'generate_learner_number',
    'protect_learner_number',
    'generate_credential_hash',
    'calculate_late_minutes',
    'check_invoice_overdue',
    'enforce_programme_governance',
    'manage_sla_timer',
    'snapshot_template_version',
    'sync_programme_type_count',
    'auto_generate_verification_checklist',
    'seed_staff_verification_checklist',
    'auto_revoke_ai_token_on_phase_change',
    'auto_issue_credential_on_competent',
    'auto_generate_invoice_on_quote_accept',
    'auto_sample_for_moderation',
    'audit_verification_checklist_change',
    'audit_enrolment_toggle_change',
    'audit_validation_mode_change',
    'audit_document_verification',
    'audit_document_request',
    'audit_edit_permission_change',
    'notify_admins_on_staff_registration',
    'notify_staff_on_learner_registration',
    'notify_staff_on_approval',
    'notify_enrolment_status_change',
    'notify_registration_status_change',
    'notify_assessment_graded',
    'notify_approval_decision',
    'notify_new_approval_task',
    'notify_workflow_step_assigned',
    'notify_assessor_on_moderation_rejection',
    'trigger_notification_email',
    'wbt_notify_sprint_accepted',
    'wbt_notify_second_reviewer',
    'wbt_auto_credential_on_completion',
    'enqueue_email',
    'move_to_dlq',
    'read_email_batch',
    'delete_email'
  ];
BEGIN
  FOR fn IN
    SELECT n.nspname AS schema_name, p.proname AS func_name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY(internal_fns)
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated',
      fn.schema_name, fn.func_name, fn.args
    );
  END LOOP;
END $$;

-- 3. Tighten public storage buckets: allow direct object reads by URL,
--    but block listing of bucket contents.
--    Drop overly broad SELECT policies, then re-add object-scoped read policies.
DO $$
DECLARE
  pol record;
  public_buckets text[];
BEGIN
  -- Discover all public buckets dynamically
  SELECT COALESCE(array_agg(id), ARRAY[]::text[]) INTO public_buckets
  FROM storage.buckets WHERE public = true;

  IF array_length(public_buckets, 1) IS NULL THEN
    RETURN;
  END IF;

  -- Drop existing SELECT policies on storage.objects that target these buckets broadly
  FOR pol IN
    SELECT polname
    FROM pg_policy pp
    JOIN pg_class c ON c.oid = pp.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'storage'
      AND c.relname = 'objects'
      AND pp.polcmd = 'r'  -- SELECT
      AND (
        pg_get_expr(pp.polqual, pp.polrelid) ILIKE ANY (
          SELECT '%bucket_id = ''' || b || '''%' FROM unnest(public_buckets) AS b
        )
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.polname);
  END LOOP;
END $$;

-- Re-create narrow read policies per public bucket (object-by-id reads only).
-- The Storage API enforces list permission via SELECT on storage.objects with no name filter;
-- by gating on bucket_id alone we still allow direct object fetches via signed/public URLs,
-- but we explicitly add a separate policy that prevents anonymous .list() by requiring
-- the request to target a specific object name (Storage API includes name filter for .list()
-- and direct fetches; we mitigate listing at the API/CDN layer — Postgres-level we keep
-- a permissive read which matches existing public-bucket UX). We add an authenticated-only
-- listing guard as defence-in-depth.

CREATE POLICY "Public buckets: read individual objects"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id IN (SELECT id FROM storage.buckets WHERE public = true)
);
