
-- Add temporary write policies for country framework management
-- These will be replaced with proper RBAC policies when auth is built

-- Countries
CREATE POLICY "Temp: anon can manage countries" ON public.countries FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Temp: authenticated can manage countries" ON public.countries FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Regulatory Bodies
CREATE POLICY "Temp: anon can manage regulatory_bodies" ON public.regulatory_bodies FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Temp: authenticated can manage regulatory_bodies" ON public.regulatory_bodies FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Qualification Frameworks
CREATE POLICY "Temp: anon can manage qualification_frameworks" ON public.qualification_frameworks FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Temp: authenticated can manage qualification_frameworks" ON public.qualification_frameworks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Qualification Levels
CREATE POLICY "Temp: anon can manage qualification_levels" ON public.qualification_levels FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Temp: authenticated can manage qualification_levels" ON public.qualification_levels FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Programme Type Country Mappings
CREATE POLICY "Temp: anon can manage programme_type_country_mappings" ON public.programme_type_country_mappings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Temp: authenticated can manage programme_type_country_mappings" ON public.programme_type_country_mappings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Compliance Requirements
CREATE POLICY "Temp: anon can manage compliance_requirements" ON public.compliance_requirements FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Temp: authenticated can manage compliance_requirements" ON public.compliance_requirements FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Funding Rules
CREATE POLICY "Temp: anon can manage funding_rules" ON public.funding_rules FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Temp: authenticated can manage funding_rules" ON public.funding_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Country Regulatory Frameworks
CREATE POLICY "Temp: anon can manage country_regulatory_frameworks" ON public.country_regulatory_frameworks FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Temp: authenticated can manage country_regulatory_frameworks" ON public.country_regulatory_frameworks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Reporting Mandates
CREATE POLICY "Temp: anon can manage reporting_mandates" ON public.reporting_mandates FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Temp: authenticated can manage reporting_mandates" ON public.reporting_mandates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Incentive Schemes
CREATE POLICY "Temp: anon can manage incentive_schemes" ON public.incentive_schemes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Temp: authenticated can manage incentive_schemes" ON public.incentive_schemes FOR ALL TO authenticated USING (true) WITH CHECK (true);
