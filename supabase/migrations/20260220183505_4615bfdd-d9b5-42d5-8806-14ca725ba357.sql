
-- ============================================
-- COUNTRY-AWARE REGULATORY FRAMEWORK SCHEMA
-- Phase 1: South Africa, Kenya, Nigeria
-- ============================================

-- 1. Countries reference table
CREATE TABLE public.countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iso_code VARCHAR(3) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  sub_region TEXT,
  currency_code VARCHAR(3) NOT NULL DEFAULT 'USD',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Regulatory bodies (SETA, TVETA, NBTE, etc.)
CREATE TABLE public.regulatory_bodies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  acronym VARCHAR(20) NOT NULL,
  body_type TEXT NOT NULL, -- 'qualification_council', 'training_authority', 'funding_body', 'accreditation_body'
  website_url TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Qualification frameworks (NQF, KNQA, etc.)
CREATE TABLE public.qualification_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  acronym VARCHAR(20) NOT NULL,
  description TEXT,
  total_levels INTEGER NOT NULL DEFAULT 10,
  regional_alignment TEXT, -- 'SADC', 'EAC', 'ECOWAS'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Qualification framework levels
CREATE TABLE public.qualification_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES public.qualification_frameworks(id) ON DELETE CASCADE,
  level_number INTEGER NOT NULL,
  level_name TEXT NOT NULL,
  descriptor TEXT,
  credit_range TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(framework_id, level_number)
);

-- 5. Country regulatory frameworks (master config per country)
CREATE TABLE public.country_regulatory_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'draft', 'archived'
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  review_date DATE,
  legislative_references JSONB DEFAULT '[]'::jsonb,
  sector_regulations JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(country_id, version)
);

-- 6. Funding rules per country
CREATE TABLE public.funding_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES public.country_regulatory_frameworks(id) ON DELETE CASCADE,
  funding_type TEXT NOT NULL, -- 'levy', 'grant', 'tax_incentive', 'subsidy', 'loan'
  name TEXT NOT NULL,
  description TEXT,
  rate_or_amount TEXT,
  eligibility_criteria JSONB DEFAULT '{}'::jsonb,
  claim_process TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Reporting mandates per country
CREATE TABLE public.reporting_mandates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES public.country_regulatory_frameworks(id) ON DELETE CASCADE,
  report_name TEXT NOT NULL,
  acronym VARCHAR(20),
  description TEXT,
  frequency TEXT NOT NULL, -- 'monthly', 'quarterly', 'annually', 'ad_hoc'
  submission_body_id UUID REFERENCES public.regulatory_bodies(id),
  template_format TEXT, -- 'excel', 'pdf', 'xml', 'json', 'csv'
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Programme type country mappings (local terminology + behaviour overrides)
CREATE TABLE public.programme_type_country_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_type_name TEXT NOT NULL, -- base type name e.g. 'Apprenticeship'
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  local_name TEXT NOT NULL, -- e.g. 'Learnership' in South Africa
  regulatory_body_id UUID REFERENCES public.regulatory_bodies(id),
  qualification_framework_id UUID REFERENCES public.qualification_frameworks(id),
  behaviour_overrides JSONB DEFAULT '{}'::jsonb, -- overrides to programme type config
  workplace_percentage INTEGER, -- e.g. 70 for South Africa
  theory_percentage INTEGER,
  mentor_requirements TEXT,
  verification_requirements TEXT,
  additional_rules JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(programme_type_name, country_id)
);

-- 9. Country-specific compliance requirements
CREATE TABLE public.compliance_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mapping_id UUID NOT NULL REFERENCES public.programme_type_country_mappings(id) ON DELETE CASCADE,
  requirement_type TEXT NOT NULL, -- 'registration', 'accreditation', 'moderation', 'certification', 'audit'
  name TEXT NOT NULL,
  description TEXT,
  responsible_body_id UUID REFERENCES public.regulatory_bodies(id),
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  frequency TEXT, -- 'once', 'annually', 'per_cohort', 'per_learner'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. B-BBEE configuration (South Africa specific, extensible for other incentive schemes)
CREATE TABLE public.incentive_schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  scheme_name TEXT NOT NULL, -- 'B-BBEE Skills Development', 'Section 12H', etc.
  scheme_type TEXT NOT NULL, -- 'points', 'tax_deduction', 'grant', 'levy_rebate'
  description TEXT,
  config JSONB DEFAULT '{}'::jsonb, -- flexible config for scheme-specific rules
  target_groups JSONB DEFAULT '[]'::jsonb, -- e.g. ['youth_18_27', 'disabled', 'unemployed']
  points_multipliers JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulatory_bodies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualification_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualification_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_regulatory_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funding_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reporting_mandates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programme_type_country_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incentive_schemes ENABLE ROW LEVEL SECURITY;

-- RLS Policies: These are reference/config tables, readable by all authenticated users
-- Write access restricted to admins (will be enforced via has_role function later)

CREATE POLICY "Authenticated users can read countries" ON public.countries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read regulatory_bodies" ON public.regulatory_bodies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read qualification_frameworks" ON public.qualification_frameworks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read qualification_levels" ON public.qualification_levels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read country_regulatory_frameworks" ON public.country_regulatory_frameworks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read funding_rules" ON public.funding_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read reporting_mandates" ON public.reporting_mandates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read programme_type_country_mappings" ON public.programme_type_country_mappings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read compliance_requirements" ON public.compliance_requirements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read incentive_schemes" ON public.incentive_schemes FOR SELECT TO authenticated USING (true);

-- Also allow public read for countries (needed before login for tenant setup)
CREATE POLICY "Public can read countries" ON public.countries FOR SELECT TO anon USING (true);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_countries_updated_at BEFORE UPDATE ON public.countries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_regulatory_bodies_updated_at BEFORE UPDATE ON public.regulatory_bodies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_qualification_frameworks_updated_at BEFORE UPDATE ON public.qualification_frameworks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_country_regulatory_frameworks_updated_at BEFORE UPDATE ON public.country_regulatory_frameworks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_funding_rules_updated_at BEFORE UPDATE ON public.funding_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_reporting_mandates_updated_at BEFORE UPDATE ON public.reporting_mandates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_programme_type_country_mappings_updated_at BEFORE UPDATE ON public.programme_type_country_mappings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_compliance_requirements_updated_at BEFORE UPDATE ON public.compliance_requirements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_incentive_schemes_updated_at BEFORE UPDATE ON public.incentive_schemes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_regulatory_bodies_country ON public.regulatory_bodies(country_id);
CREATE INDEX idx_qualification_frameworks_country ON public.qualification_frameworks(country_id);
CREATE INDEX idx_qualification_levels_framework ON public.qualification_levels(framework_id);
CREATE INDEX idx_country_regulatory_frameworks_country ON public.country_regulatory_frameworks(country_id);
CREATE INDEX idx_funding_rules_framework ON public.funding_rules(framework_id);
CREATE INDEX idx_reporting_mandates_framework ON public.reporting_mandates(framework_id);
CREATE INDEX idx_programme_type_country_mappings_country ON public.programme_type_country_mappings(country_id);
CREATE INDEX idx_compliance_requirements_mapping ON public.compliance_requirements(mapping_id);
CREATE INDEX idx_incentive_schemes_country ON public.incentive_schemes(country_id);
