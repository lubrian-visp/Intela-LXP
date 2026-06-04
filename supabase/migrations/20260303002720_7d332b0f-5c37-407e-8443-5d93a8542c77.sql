
-- Add SELECT policies for assessors, moderators, and talent managers on enrolments
-- These roles need to view enrolment data for their respective portals

CREATE POLICY "Assessors can read enrolments"
ON public.enrolments
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'assessor'::app_role)
);

CREATE POLICY "Moderators can read enrolments"
ON public.enrolments
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'moderator'::app_role)
);

CREATE POLICY "Talent managers can read enrolments"
ON public.enrolments
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'talent_manager'::app_role)
);
