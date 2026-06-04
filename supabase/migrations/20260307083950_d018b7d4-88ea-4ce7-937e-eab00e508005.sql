
ALTER TABLE public.assessor_reports
  ADD COLUMN IF NOT EXISTS report_mode text NOT NULL DEFAULT 'cohort',
  ADD COLUMN IF NOT EXISTS learner_id uuid,
  ADD COLUMN IF NOT EXISTS module_us_covered text;
