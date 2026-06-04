-- =========================================================
-- 1. Restrict EXECUTE on internal SECURITY DEFINER helpers
--    Revoke from public/anon; grant to authenticated only.
--    RLS policies invoke these as the calling role, so
--    authenticated access is sufficient.
-- =========================================================

DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'has_role(uuid, app_role)',
    'has_permission(uuid, text, text)',
    'is_platform_admin(uuid)',
    'is_tenant_member(uuid, uuid)',
    'is_tenant_admin(uuid, uuid)',
    'get_user_tenant_ids(uuid)',
    'can_approve_programme(uuid, uuid)',
    'can_approve_registration(uuid, uuid)',
    'can_edit_programme_content(uuid, uuid)',
    'can_act_on_workflow_step(uuid, uuid)',
    'is_delegated_approver(uuid, uuid)'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC', fn);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM anon', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', fn);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'Function % not found, skipping', fn;
    END;
  END LOOP;
END $$;

-- =========================================================
-- 2. learner-documents bucket: scoped learner self-upload
--    Path convention (per useUploadLearnerDocument):
--      <registration_id>/<doctype>_<ts>.<ext>
--    Allow INSERT only when the first folder = a registration
--    owned by the calling auth.uid().
-- =========================================================

DROP POLICY IF EXISTS "Learners can upload to own registration folder"
  ON storage.objects;

CREATE POLICY "Learners can upload to own registration folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'learner-documents'
  AND EXISTS (
    SELECT 1
    FROM public.learner_registrations lr
    WHERE lr.id::text = (storage.foldername(name))[1]
      AND lr.user_id = auth.uid()
  )
);

-- Allow learners to read back their own uploaded documents
DROP POLICY IF EXISTS "Learners can read own registration folder"
  ON storage.objects;

CREATE POLICY "Learners can read own registration folder"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'learner-documents'
  AND EXISTS (
    SELECT 1
    FROM public.learner_registrations lr
    WHERE lr.id::text = (storage.foldername(name))[1]
      AND lr.user_id = auth.uid()
  )
);