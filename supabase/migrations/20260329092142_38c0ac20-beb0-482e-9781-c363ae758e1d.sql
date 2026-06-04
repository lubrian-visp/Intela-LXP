-- Allow learners to read their own documents via their registration
CREATE POLICY "Learners read own documents"
ON public.learner_documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.learner_registrations lr
    WHERE lr.id = learner_documents.registration_id
      AND lr.user_id = auth.uid()
  )
);