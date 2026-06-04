
-- Fix: Add operations role to cohorts ALL policy for force-delete cleanup
DROP POLICY IF EXISTS "Admins manage cohorts" ON public.cohorts;
CREATE POLICY "Admins manage cohorts" ON public.cohorts
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'programme_manager'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'programme_manager'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
  );

-- Fix: Add operations role to issued_credentials ALL policy
DROP POLICY IF EXISTS "Admins manage credentials" ON public.issued_credentials;
CREATE POLICY "Admins manage credentials" ON public.issued_credentials
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'programme_manager'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'programme_manager'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
  );

-- Fix: Add operations role to moderation_items ALL policy
DROP POLICY IF EXISTS "Moderators manage moderation items" ON public.moderation_items;
CREATE POLICY "Moderators manage moderation items" ON public.moderation_items
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'moderator'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'moderator'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
  );

-- Fix: Add operations role to certificate_templates ALL policy
DROP POLICY IF EXISTS "Staff can manage certificate_templates" ON public.certificate_templates;
CREATE POLICY "Staff can manage certificate_templates" ON public.certificate_templates
  FOR ALL TO authenticated
  USING (
    is_platform_admin(auth.uid())
    OR has_role(auth.uid(), 'programme_manager'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
  )
  WITH CHECK (
    is_platform_admin(auth.uid())
    OR has_role(auth.uid(), 'programme_manager'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
  );
