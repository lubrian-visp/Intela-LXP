
-- ============================================================
-- Country-Agnostic Sponsor Compliance Framework
-- Seeded with South Africa B-BBEE SD & ED as first framework
-- ============================================================

-- 1. Compliance Frameworks (one per country regulatory requirement)
CREATE TABLE public.sponsor_compliance_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  framework_code TEXT NOT NULL, -- e.g. 'BBBEE_SD_ED', 'NITA_LEVY'
  framework_name TEXT NOT NULL, -- e.g. 'B-BBEE Skills & Enterprise Development'
  description TEXT,
  version TEXT NOT NULL DEFAULT '1.0',
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  beneficiary_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  scoring_config JSONB NOT NULL DEFAULT '{}'::jsonb, -- formula, caps, weighting
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(country_id, framework_code, version)
);

-- 2. Indicator Definitions (template indicators per framework)
CREATE TABLE public.sponsor_compliance_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES public.sponsor_compliance_frameworks(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'skills_development' or 'enterprise_development'
  indicator_code TEXT NOT NULL, -- e.g. 'SD_TRAINING_SPEND'
  indicator_name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL DEFAULT 'ZAR', -- ZAR, hours, count, percentage
  max_points NUMERIC NOT NULL DEFAULT 0,
  target_value NUMERIC, -- default target, can be overridden per sponsor
  is_auto_captured BOOLEAN NOT NULL DEFAULT false, -- auto from platform data
  data_source TEXT, -- e.g. 'enrolments.progress', 'training_sessions.duration'
  sequence_order INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(framework_id, indicator_code)
);

-- 3. Sponsor Compliance Records (actual tracking per sponsor per period)
CREATE TABLE public.sponsor_compliance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES public.sponsor_compliance_frameworks(id),
  indicator_id UUID NOT NULL REFERENCES public.sponsor_compliance_indicators(id),
  sponsor_id UUID NOT NULL, -- references auth.users
  reporting_period_start DATE NOT NULL,
  reporting_period_end DATE NOT NULL,
  target_value NUMERIC NOT NULL DEFAULT 0,
  actual_value NUMERIC NOT NULL DEFAULT 0,
  calculated_score NUMERIC NOT NULL DEFAULT 0,
  score_capped BOOLEAN NOT NULL DEFAULT false,
  beneficiary_breakdown JSONB DEFAULT '{}'::jsonb, -- demographics per B-BBEE
  notes TEXT,
  last_calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(indicator_id, sponsor_id, reporting_period_start)
);

-- 4. Evidence for compliance records
CREATE TABLE public.sponsor_compliance_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES public.sponsor_compliance_records(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL DEFAULT 'document', -- document, link, system_reference
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT, -- storage path
  external_url TEXT, -- or external link
  reference_table TEXT, -- e.g. 'enrolments', 'training_sessions'
  reference_id UUID,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Generated Reports
CREATE TABLE public.sponsor_compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES public.sponsor_compliance_frameworks(id),
  sponsor_id UUID NOT NULL,
  reporting_period_start DATE NOT NULL,
  reporting_period_end DATE NOT NULL,
  report_data JSONB NOT NULL DEFAULT '{}'::jsonb, -- full snapshot
  total_sd_score NUMERIC DEFAULT 0,
  total_ed_score NUMERIC DEFAULT 0,
  bbbee_level TEXT, -- e.g. 'Level 2'
  status TEXT NOT NULL DEFAULT 'draft', -- draft, submitted, approved, archived
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  file_path TEXT, -- generated PDF path
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.sponsor_compliance_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_compliance_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_compliance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_compliance_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_compliance_reports ENABLE ROW LEVEL SECURITY;

-- Frameworks: read for authenticated, manage for admins
CREATE POLICY "Authenticated read compliance frameworks"
  ON public.sponsor_compliance_frameworks FOR SELECT USING (true);
CREATE POLICY "Admins manage compliance frameworks"
  ON public.sponsor_compliance_frameworks FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role));

-- Indicators: read for authenticated, manage for admins
CREATE POLICY "Authenticated read compliance indicators"
  ON public.sponsor_compliance_indicators FOR SELECT USING (true);
CREATE POLICY "Admins manage compliance indicators"
  ON public.sponsor_compliance_indicators FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role));

-- Records: sponsors see own, admins manage all
CREATE POLICY "Sponsors see own compliance records"
  ON public.sponsor_compliance_records FOR SELECT
  USING (sponsor_id = auth.uid());
CREATE POLICY "Admins manage all compliance records"
  ON public.sponsor_compliance_records FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role));

-- Evidence: sponsors see own, admins manage all
CREATE POLICY "Sponsors see own evidence"
  ON public.sponsor_compliance_evidence FOR SELECT
  USING (EXISTS (SELECT 1 FROM sponsor_compliance_records r WHERE r.id = record_id AND r.sponsor_id = auth.uid()));
CREATE POLICY "Admins manage all evidence"
  ON public.sponsor_compliance_evidence FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role));
CREATE POLICY "Sponsors upload own evidence"
  ON public.sponsor_compliance_evidence FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM sponsor_compliance_records r WHERE r.id = record_id AND r.sponsor_id = auth.uid()));

-- Reports: sponsors see own, admins manage all
CREATE POLICY "Sponsors see own reports"
  ON public.sponsor_compliance_reports FOR SELECT
  USING (sponsor_id = auth.uid());
CREATE POLICY "Admins manage all reports"
  ON public.sponsor_compliance_reports FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role));

-- ============================================================
-- Score calculation function
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_compliance_score(
  _actual NUMERIC,
  _target NUMERIC,
  _max_points NUMERIC
)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT LEAST(
    ROUND((_actual / NULLIF(_target, 0)) * _max_points, 2),
    _max_points
  )
$$;

-- ============================================================
-- Realtime
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.sponsor_compliance_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sponsor_compliance_reports;

-- ============================================================
-- Updated_at triggers
-- ============================================================
CREATE TRIGGER update_sponsor_compliance_frameworks_updated_at
  BEFORE UPDATE ON public.sponsor_compliance_frameworks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sponsor_compliance_indicators_updated_at
  BEFORE UPDATE ON public.sponsor_compliance_indicators
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sponsor_compliance_records_updated_at
  BEFORE UPDATE ON public.sponsor_compliance_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sponsor_compliance_reports_updated_at
  BEFORE UPDATE ON public.sponsor_compliance_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
