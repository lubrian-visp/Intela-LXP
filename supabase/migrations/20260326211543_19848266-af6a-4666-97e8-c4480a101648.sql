-- Fix 1: staff_role_assignments - restrict INSERT/UPDATE/DELETE to admins only
DROP POLICY IF EXISTS "Authenticated users can insert staff role assignments" ON public.staff_role_assignments;
DROP POLICY IF EXISTS "Authenticated users can update staff role assignments" ON public.staff_role_assignments;
DROP POLICY IF EXISTS "Authenticated users can delete staff role assignments" ON public.staff_role_assignments;

CREATE POLICY "Admins can insert staff role assignments"
ON public.staff_role_assignments FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'systems_admin'::app_role)
  OR public.has_role(auth.uid(), 'operations'::app_role)
);

CREATE POLICY "Admins can update staff role assignments"
ON public.staff_role_assignments FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'systems_admin'::app_role)
  OR public.has_role(auth.uid(), 'operations'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'systems_admin'::app_role)
  OR public.has_role(auth.uid(), 'operations'::app_role)
);

CREATE POLICY "Admins can delete staff role assignments"
ON public.staff_role_assignments FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'systems_admin'::app_role)
  OR public.has_role(auth.uid(), 'operations'::app_role)
);

-- Fix 2: programme_types - remove overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can manage programme types" ON public.programme_types;

-- Fix 3: cohort_staff_assignments - restrict INSERT/DELETE to admins/PM
DROP POLICY IF EXISTS "Authenticated users can insert cohort staff" ON public.cohort_staff_assignments;
DROP POLICY IF EXISTS "Authenticated users can delete cohort staff" ON public.cohort_staff_assignments;

CREATE POLICY "Admins can insert cohort staff"
ON public.cohort_staff_assignments FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'systems_admin'::app_role)
  OR public.has_role(auth.uid(), 'operations'::app_role)
  OR public.has_role(auth.uid(), 'programme_manager'::app_role)
);

CREATE POLICY "Admins can delete cohort staff"
ON public.cohort_staff_assignments FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'systems_admin'::app_role)
  OR public.has_role(auth.uid(), 'operations'::app_role)
  OR public.has_role(auth.uid(), 'programme_manager'::app_role)
);

-- Fix 4: sponsor_invitations - restrict public read to authenticated + token match
DROP POLICY IF EXISTS "Public read invitations by token" ON public.sponsor_invitations;

CREATE POLICY "Authenticated read invitations"
ON public.sponsor_invitations FOR SELECT TO authenticated
USING (true);

-- Fix 5: payment_gateways - restrict read to admins only
DROP POLICY IF EXISTS "Authenticated users read gateways" ON public.payment_gateways;

CREATE POLICY "Admins can read payment gateways"
ON public.payment_gateways FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'systems_admin'::app_role)
  OR public.has_role(auth.uid(), 'operations'::app_role)
);

-- Fix 6: course_content_links - restrict write to content managers
DROP POLICY IF EXISTS "Authenticated users can insert course content links" ON public.course_content_links;
DROP POLICY IF EXISTS "Authenticated users can update course content links" ON public.course_content_links;
DROP POLICY IF EXISTS "Authenticated users can delete course content links" ON public.course_content_links;

CREATE POLICY "Content managers can insert course content links"
ON public.course_content_links FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'systems_admin'::app_role)
  OR public.has_role(auth.uid(), 'operations'::app_role)
  OR public.has_role(auth.uid(), 'programme_manager'::app_role)
);

CREATE POLICY "Content managers can update course content links"
ON public.course_content_links FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'systems_admin'::app_role)
  OR public.has_role(auth.uid(), 'operations'::app_role)
  OR public.has_role(auth.uid(), 'programme_manager'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'systems_admin'::app_role)
  OR public.has_role(auth.uid(), 'operations'::app_role)
  OR public.has_role(auth.uid(), 'programme_manager'::app_role)
);

CREATE POLICY "Content managers can delete course content links"
ON public.course_content_links FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'systems_admin'::app_role)
  OR public.has_role(auth.uid(), 'operations'::app_role)
  OR public.has_role(auth.uid(), 'programme_manager'::app_role)
);