-- Allow facilitators, assessors, mentors, moderators, programme_managers, and operations to read profiles
-- so they can resolve learner names in their dashboards
CREATE POLICY "Staff can view all profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'facilitator'::app_role)
  OR has_role(auth.uid(), 'assessor'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR has_role(auth.uid(), 'mentor'::app_role)
  OR has_role(auth.uid(), 'programme_manager'::app_role)
  OR has_role(auth.uid(), 'operations'::app_role)
  OR has_role(auth.uid(), 'talent_manager'::app_role)
  OR has_role(auth.uid(), 'systems_admin'::app_role)
);