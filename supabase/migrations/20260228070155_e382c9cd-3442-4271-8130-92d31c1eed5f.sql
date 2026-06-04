-- Fix approval_tasks RLS: the admin policy must be PERMISSIVE so ops/super_admin can see ALL tasks
-- Drop the restrictive policies and recreate as permissive

DROP POLICY IF EXISTS "Admins manage all tasks" ON public.approval_tasks;
DROP POLICY IF EXISTS "Users see assigned tasks" ON public.approval_tasks;
DROP POLICY IF EXISTS "Assigned users can update tasks" ON public.approval_tasks;

-- Permissive: Admins (super_admin, operations) can do everything
CREATE POLICY "Admins manage all tasks"
ON public.approval_tasks FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role));

-- Permissive: Users see tasks assigned to them or requested by them
CREATE POLICY "Users see own tasks"
ON public.approval_tasks FOR SELECT
TO authenticated
USING (assigned_to = auth.uid() OR requested_by = auth.uid());

-- Permissive: Assigned users can update
CREATE POLICY "Assigned users can update tasks"
ON public.approval_tasks FOR UPDATE
TO authenticated
USING (assigned_to = auth.uid());

-- Permissive: Programme managers can see tasks for programmes (they need visibility)
CREATE POLICY "Programme managers see programme tasks"
ON public.approval_tasks FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'programme_manager'::app_role) AND reference_table = 'programmes');