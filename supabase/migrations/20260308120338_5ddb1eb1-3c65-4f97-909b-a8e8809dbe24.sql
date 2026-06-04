
-- 1. programme_types: drop anon permissive, add proper policies
DROP POLICY IF EXISTS "Anon can manage programme types temporarily" ON public.programme_types;
CREATE POLICY "Authenticated can read programme types"
  ON public.programme_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage programme types"
  ON public.programme_types FOR ALL TO authenticated
  USING (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role))
  WITH CHECK (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role));

-- 2. programme_type_country_mappings
DROP POLICY IF EXISTS "Temp: anon can manage programme_type_country_mappings" ON public.programme_type_country_mappings;
DROP POLICY IF EXISTS "Temp: authenticated can manage programme_type_country_mappings" ON public.programme_type_country_mappings;
CREATE POLICY "Authenticated can read programme_type_country_mappings"
  ON public.programme_type_country_mappings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage programme_type_country_mappings"
  ON public.programme_type_country_mappings FOR ALL TO authenticated
  USING (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role))
  WITH CHECK (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role));

-- 3. qualification_frameworks
DROP POLICY IF EXISTS "Temp: anon can manage qualification_frameworks" ON public.qualification_frameworks;
DROP POLICY IF EXISTS "Temp: authenticated can manage qualification_frameworks" ON public.qualification_frameworks;
CREATE POLICY "Authenticated can read qualification_frameworks"
  ON public.qualification_frameworks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage qualification_frameworks"
  ON public.qualification_frameworks FOR ALL TO authenticated
  USING (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role))
  WITH CHECK (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role));

-- 4. qualification_levels
DROP POLICY IF EXISTS "Temp: authenticated can manage qualification_levels" ON public.qualification_levels;
DROP POLICY IF EXISTS "Temp: anon can manage qualification_levels" ON public.qualification_levels;
CREATE POLICY "Authenticated can read qualification_levels"
  ON public.qualification_levels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage qualification_levels"
  ON public.qualification_levels FOR ALL TO authenticated
  USING (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role))
  WITH CHECK (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role));

-- 5. regulatory_bodies
DROP POLICY IF EXISTS "Temp: authenticated can manage regulatory_bodies" ON public.regulatory_bodies;
DROP POLICY IF EXISTS "Temp: anon can manage regulatory_bodies" ON public.regulatory_bodies;
CREATE POLICY "Authenticated can read regulatory_bodies"
  ON public.regulatory_bodies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage regulatory_bodies"
  ON public.regulatory_bodies FOR ALL TO authenticated
  USING (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role))
  WITH CHECK (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role));

-- 6. reporting_mandates
DROP POLICY IF EXISTS "Temp: authenticated can manage reporting_mandates" ON public.reporting_mandates;
DROP POLICY IF EXISTS "Temp: anon can manage reporting_mandates" ON public.reporting_mandates;
CREATE POLICY "Authenticated can read reporting_mandates"
  ON public.reporting_mandates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage reporting_mandates"
  ON public.reporting_mandates FOR ALL TO authenticated
  USING (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role))
  WITH CHECK (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role));
