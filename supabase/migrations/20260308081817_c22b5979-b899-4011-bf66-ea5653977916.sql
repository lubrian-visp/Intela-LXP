
-- Moderator QA Reports table
CREATE TABLE public.moderator_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id uuid NOT NULL,
  report_mode text NOT NULL DEFAULT 'cohort',
  programme_id uuid REFERENCES public.programmes(id) ON DELETE CASCADE NOT NULL,
  cohort_id uuid REFERENCES public.cohorts(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  
  -- Section 1: Moderation Summary
  total_items_reviewed integer DEFAULT 0,
  approved_count integer DEFAULT 0,
  rejected_count integer DEFAULT 0,
  avg_turnaround_hours numeric DEFAULT 0,
  sampling_target_pct numeric DEFAULT 25,
  sampling_achieved_pct numeric DEFAULT 0,
  summary_notes text,
  
  -- Section 2: Assessor Performance
  assessor_performance jsonb DEFAULT '[]'::jsonb,
  
  -- Section 3: Findings & Recommendations
  systemic_issues text,
  patterns_observed text,
  recommendations text,
  improvement_actions text,
  
  -- Section 4: Compliance Declaration
  declaration_text text DEFAULT 'I hereby declare that this moderation was conducted in accordance with organisational quality assurance policies, the Four-Eyes Principle was observed, and no conflicts of interest were present.',
  moderator_signature_date text,
  qa_manager_signature_date text,
  
  -- Metadata
  report_date text,
  period_start text,
  period_end text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.moderator_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Moderators can manage own reports"
  ON public.moderator_reports FOR ALL TO authenticated
  USING (moderator_id = auth.uid())
  WITH CHECK (moderator_id = auth.uid());

CREATE POLICY "Admins can view all moderator reports"
  ON public.moderator_reports FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));
