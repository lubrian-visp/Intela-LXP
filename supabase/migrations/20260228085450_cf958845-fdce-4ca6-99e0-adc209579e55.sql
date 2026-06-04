
-- ============================================
-- SECURITY HARDENING: Replace temp RLS policies
-- ============================================

-- 1. COUNTRIES table
DROP POLICY IF EXISTS "Temp: anon can manage countries" ON public.countries;
DROP POLICY IF EXISTS "Temp: authenticated can manage countries" ON public.countries;

CREATE POLICY "Admins manage countries"
ON public.countries FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role));

-- 2. COUNTRY_REGULATORY_FRAMEWORKS table
DROP POLICY IF EXISTS "Temp: anon can manage country_regulatory_frameworks" ON public.country_regulatory_frameworks;
DROP POLICY IF EXISTS "Temp: authenticated can manage country_regulatory_frameworks" ON public.country_regulatory_frameworks;

CREATE POLICY "Admins manage regulatory frameworks"
ON public.country_regulatory_frameworks FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role));

-- 3. COMPLIANCE_REQUIREMENTS table
DROP POLICY IF EXISTS "Temp: anon can manage compliance_requirements" ON public.compliance_requirements;
DROP POLICY IF EXISTS "Temp: authenticated can manage compliance_requirements" ON public.compliance_requirements;

CREATE POLICY "Admins manage compliance requirements"
ON public.compliance_requirements FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role));

-- 4. FUNDING_RULES table
DROP POLICY IF EXISTS "Temp: anon can manage funding_rules" ON public.funding_rules;
DROP POLICY IF EXISTS "Temp: authenticated can manage funding_rules" ON public.funding_rules;

CREATE POLICY "Admins manage funding rules"
ON public.funding_rules FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role));

-- 5. INCENTIVE_SCHEMES table
DROP POLICY IF EXISTS "Temp: anon can manage incentive_schemes" ON public.incentive_schemes;
DROP POLICY IF EXISTS "Temp: authenticated can manage incentive_schemes" ON public.incentive_schemes;

CREATE POLICY "Admins manage incentive schemes"
ON public.incentive_schemes FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role));
