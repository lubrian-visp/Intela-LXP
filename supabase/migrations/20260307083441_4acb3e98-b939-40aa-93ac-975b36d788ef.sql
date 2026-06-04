
-- Add unit standard fields to programme_modules
ALTER TABLE public.programme_modules
  ADD COLUMN IF NOT EXISTS unit_standard_code text,
  ADD COLUMN IF NOT EXISTS nqf_level integer;

-- Create assessor_reports table
CREATE TABLE public.assessor_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessor_id uuid NOT NULL,
  programme_id uuid NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  cohort_id uuid REFERENCES public.cohorts(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  
  -- Header
  assessor_name text,
  submission_date date,
  client_name text,
  venue text,
  programme_name text,
  start_date date,
  end_date date,
  
  -- Section 2: Outcomes-based assessment criteria
  section2_criteria jsonb DEFAULT '[]'::jsonb,
  section2_problems text,
  section2_strengths text,
  
  -- Section 3: Prepare candidate for assessments
  section3_criteria jsonb DEFAULT '[]'::jsonb,
  section3_problems text,
  section3_strengths text,
  section3_recommendations text,
  section3_evidence text,
  
  -- Section 4: Learner outcomes (auto-populated + editable)
  section4_learners jsonb DEFAULT '[]'::jsonb,
  
  -- Section 5: Difficulties
  section5_difficulties text,
  section5_conflicts text,
  section5_mentor_update text,
  section5_declaration text DEFAULT 'All learners who submitted evidence were assessed as guided by outcome based Principles.',
  
  -- Footer signatures
  assessor_signature_date date,
  admin_signature_date date,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.assessor_reports ENABLE ROW LEVEL SECURITY;

-- Assessors can manage their own reports
CREATE POLICY "Assessors manage own reports"
  ON public.assessor_reports
  FOR ALL
  TO authenticated
  USING (assessor_id = auth.uid() OR public.is_platform_admin(auth.uid()))
  WITH CHECK (assessor_id = auth.uid() OR public.is_platform_admin(auth.uid()));

-- Operations and programme managers can view all reports
CREATE POLICY "Staff view all reports"
  ON public.assessor_reports
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'operations'::app_role) OR 
    public.has_role(auth.uid(), 'programme_manager'::app_role)
  );

-- Updated at trigger
CREATE TRIGGER update_assessor_reports_updated_at
  BEFORE UPDATE ON public.assessor_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
