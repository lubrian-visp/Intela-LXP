-- Allow learners to read their own files in the learner-documents bucket.
-- File path convention (per useUploadLearnerDocument): {registration_id}/{...}
CREATE POLICY "Learners can read own documents from storage"
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