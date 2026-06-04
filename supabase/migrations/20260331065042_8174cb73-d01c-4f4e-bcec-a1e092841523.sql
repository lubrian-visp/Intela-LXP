-- Update pathways ALL policy to include operations role
DROP POLICY IF EXISTS "Admins manage pathways" ON public.pathways;
CREATE POLICY "Admins manage pathways" ON public.pathways
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'programme_manager'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
    OR has_role(auth.uid(), 'systems_admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'programme_manager'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
    OR has_role(auth.uid(), 'systems_admin'::app_role)
  );

-- Update programme_modules ALL policy to include operations role
DROP POLICY IF EXISTS "Admins manage modules" ON public.programme_modules;
CREATE POLICY "Admins manage modules" ON public.programme_modules
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'programme_manager'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
    OR has_role(auth.uid(), 'systems_admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'programme_manager'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
    OR has_role(auth.uid(), 'systems_admin'::app_role)
  );

-- Update content_blocks ALL policy to include operations role
DROP POLICY IF EXISTS "Admins manage content blocks" ON public.content_blocks;
CREATE POLICY "Admins manage content blocks" ON public.content_blocks
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'programme_manager'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
    OR has_role(auth.uid(), 'systems_admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'programme_manager'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
    OR has_role(auth.uid(), 'systems_admin'::app_role)
  );