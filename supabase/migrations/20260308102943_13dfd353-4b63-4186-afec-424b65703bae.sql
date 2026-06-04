
-- Sponsor SD financial profile for B-BBEE leviable amount calculations
CREATE TABLE public.sponsor_sd_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id uuid NOT NULL,
  financial_year text NOT NULL,
  scorecard_type text NOT NULL DEFAULT 'generic' CHECK (scorecard_type IN ('generic', 'qse')),
  annual_leviable_amount numeric NOT NULL DEFAULT 0,
  target_percentage numeric NOT NULL DEFAULT 6,
  calculated_target numeric GENERATED ALWAYS AS (annual_leviable_amount * target_percentage / 100) STORED,
  sub_minimum_percentage numeric NOT NULL DEFAULT 40,
  admin_cap_percentage numeric NOT NULL DEFAULT 15,
  informal_cap_percentage numeric NOT NULL DEFAULT 25,
  travel_cap_percentage numeric NOT NULL DEFAULT 15,
  wsp_submitted boolean NOT NULL DEFAULT false,
  atr_submitted boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(sponsor_id, financial_year)
);

ALTER TABLE public.sponsor_sd_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sponsors manage own SD profiles"
ON public.sponsor_sd_profiles FOR ALL
USING (sponsor_id = auth.uid())
WITH CHECK (sponsor_id = auth.uid());

CREATE POLICY "Admins manage all SD profiles"
ON public.sponsor_sd_profiles FOR ALL
USING (public.is_platform_admin(auth.uid()));

-- Expenditure records by category
CREATE TABLE public.sponsor_sd_expenditures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.sponsor_sd_profiles(id) ON DELETE CASCADE,
  sponsor_id uuid NOT NULL,
  category text NOT NULL CHECK (category IN ('direct_training', 'learnership', 'bursary', 'admin', 'informal_training', 'travel_accommodation')),
  description text,
  amount numeric NOT NULL DEFAULT 0,
  beneficiary_type text,
  is_accredited boolean NOT NULL DEFAULT false,
  evidence_reference text,
  expenditure_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sponsor_sd_expenditures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sponsors manage own expenditures"
ON public.sponsor_sd_expenditures FOR ALL
USING (sponsor_id = auth.uid())
WITH CHECK (sponsor_id = auth.uid());

CREATE POLICY "Admins manage all expenditures"
ON public.sponsor_sd_expenditures FOR ALL
USING (public.is_platform_admin(auth.uid()));

-- SETA compliance checklist
CREATE TABLE public.sponsor_seta_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id uuid NOT NULL,
  financial_year text NOT NULL,
  check_key text NOT NULL,
  check_label text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  completed_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(sponsor_id, financial_year, check_key)
);

ALTER TABLE public.sponsor_seta_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sponsors manage own checklist"
ON public.sponsor_seta_checklist FOR ALL
USING (sponsor_id = auth.uid())
WITH CHECK (sponsor_id = auth.uid());

CREATE POLICY "Admins manage all checklists"
ON public.sponsor_seta_checklist FOR ALL
USING (public.is_platform_admin(auth.uid()));
