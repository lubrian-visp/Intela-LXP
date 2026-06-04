
-- 1. Fix meeting_participants: restrict SELECT to authenticated session participants only
DROP POLICY IF EXISTS "Anyone can view meeting_participants" ON public.meeting_participants;
DROP POLICY IF EXISTS "Public can view meeting_participants" ON public.meeting_participants;
DROP POLICY IF EXISTS "Users can view meeting participants" ON public.meeting_participants;

CREATE POLICY "Authenticated session participants can view meeting_participants"
ON public.meeting_participants FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.meeting_participants mp2
    WHERE mp2.session_id = meeting_participants.session_id
      AND mp2.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'systems_admin'::app_role)
  OR has_role(auth.uid(), 'operations'::app_role)
  OR has_role(auth.uid(), 'facilitator'::app_role)
);

-- 2. Fix learner_points: restrict INSERT to admin/staff roles only
DROP POLICY IF EXISTS "System can insert learner_points" ON public.learner_points;

CREATE POLICY "Staff can insert learner_points"
ON public.learner_points FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'systems_admin'::app_role)
  OR has_role(auth.uid(), 'programme_manager'::app_role)
  OR has_role(auth.uid(), 'facilitator'::app_role)
  OR has_role(auth.uid(), 'operations'::app_role)
);

-- 3. Fix staff_role_assignments: restrict SELECT to admins only
DROP POLICY IF EXISTS "Users can view staff_role_assignments" ON public.staff_role_assignments;
DROP POLICY IF EXISTS "Anyone can view staff_role_assignments" ON public.staff_role_assignments;
DROP POLICY IF EXISTS "Authenticated users can view staff_role_assignments" ON public.staff_role_assignments;

CREATE POLICY "Admins can view staff_role_assignments"
ON public.staff_role_assignments FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'systems_admin'::app_role)
  OR has_role(auth.uid(), 'operations'::app_role)
  OR has_role(auth.uid(), 'programme_manager'::app_role)
);

-- 4. Fix role_definitions: restrict SELECT to admins and users with that role
DROP POLICY IF EXISTS "Anyone can view role_definitions" ON public.role_definitions;
DROP POLICY IF EXISTS "Public can view role_definitions" ON public.role_definitions;
DROP POLICY IF EXISTS "Authenticated users can view role_definitions" ON public.role_definitions;
DROP POLICY IF EXISTS "Users can view role_definitions" ON public.role_definitions;

CREATE POLICY "Admins and assigned users can view role_definitions"
ON public.role_definitions FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'systems_admin'::app_role)
  OR has_role(auth.uid(), 'operations'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.user_role_scopes urs
    WHERE urs.role_definition_id = role_definitions.id
      AND urs.user_id = auth.uid()
      AND urs.is_active = true
  )
);

-- 5. Fix role_permissions: restrict SELECT to admins and users with that role
DROP POLICY IF EXISTS "Anyone can view role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Public can view role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Authenticated users can view role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Users can view role_permissions" ON public.role_permissions;

CREATE POLICY "Admins and assigned users can view role_permissions"
ON public.role_permissions FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'systems_admin'::app_role)
  OR has_role(auth.uid(), 'operations'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.user_role_scopes urs
    WHERE urs.role_definition_id = role_permissions.role_definition_id
      AND urs.user_id = auth.uid()
      AND urs.is_active = true
  )
);

-- 6. Fix feature_flags: restrict SELECT to authenticated only (remove public/anon access)
DROP POLICY IF EXISTS "Anyone can view feature_flags" ON public.feature_flags;
DROP POLICY IF EXISTS "Public can view feature_flags" ON public.feature_flags;
DROP POLICY IF EXISTS "Users can view feature_flags" ON public.feature_flags;
DROP POLICY IF EXISTS "Authenticated users can view feature_flags" ON public.feature_flags;

CREATE POLICY "Authenticated users can view feature_flags"
ON public.feature_flags FOR SELECT
TO authenticated
USING (true);
