
-- Allow learners to read non-private mentor notes written about them
CREATE POLICY "Learners can read non-private notes about them"
ON public.wbt_mentor_notes
FOR SELECT
TO authenticated
USING (
  learner_id = auth.uid() AND is_private = false
);
