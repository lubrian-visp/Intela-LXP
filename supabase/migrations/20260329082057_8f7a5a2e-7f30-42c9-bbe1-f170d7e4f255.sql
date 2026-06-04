
-- 1. Fix assessment_submissions: split assessor ALL policy into scoped SELECT + write
DROP POLICY IF EXISTS "Assessors manage assigned submissions" ON public.assessment_submissions;

-- Assessors can READ all submissions (needed for cross-marking, moderation visibility)
CREATE POLICY "Assessors read submissions"
ON public.assessment_submissions FOR SELECT
TO authenticated
USING (
  assessor_id = auth.uid()
  OR has_role(auth.uid(), 'assessor'::app_role)
);

-- Assessors can only UPDATE submissions assigned to them
CREATE POLICY "Assessors update assigned submissions"
ON public.assessment_submissions FOR UPDATE
TO authenticated
USING (assessor_id = auth.uid())
WITH CHECK (assessor_id = auth.uid());

-- Assessors can only INSERT submissions assigned to them
CREATE POLICY "Assessors insert assigned submissions"
ON public.assessment_submissions FOR INSERT
TO authenticated
WITH CHECK (assessor_id = auth.uid());

-- Similarly fix moderator ALL policy to restrict writes
DROP POLICY IF EXISTS "Moderators review submissions" ON public.assessment_submissions;

CREATE POLICY "Moderators read submissions"
ON public.assessment_submissions FOR SELECT
TO authenticated
USING (
  moderator_id = auth.uid()
  OR has_role(auth.uid(), 'moderator'::app_role)
);

CREATE POLICY "Moderators update assigned submissions"
ON public.assessment_submissions FOR UPDATE
TO authenticated
USING (moderator_id = auth.uid())
WITH CHECK (moderator_id = auth.uid());

-- 2. Fix session_chat_messages: restrict to session participants and staff
DROP POLICY IF EXISTS "Authenticated read session chat" ON public.session_chat_messages;

CREATE POLICY "Session participants and staff read chat"
ON public.session_chat_messages FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM meeting_participants mp
    WHERE mp.session_id = session_chat_messages.session_id
      AND mp.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'systems_admin'::app_role)
  OR has_role(auth.uid(), 'facilitator'::app_role)
  OR has_role(auth.uid(), 'programme_manager'::app_role)
);
