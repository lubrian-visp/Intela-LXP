
-- 1. Add programme-level assessment configuration table
-- This stores per-programme overrides of the Programme Type's assessment defaults
CREATE TABLE public.programme_assessment_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id uuid NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  assessment_type text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  requires_moderation boolean NOT NULL DEFAULT false,
  weighting numeric DEFAULT null,
  max_attempts integer NOT NULL DEFAULT 1,
  allow_resubmission boolean NOT NULL DEFAULT false,
  pass_mark integer DEFAULT null,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(programme_id, assessment_type)
);

-- Enable RLS
ALTER TABLE public.programme_assessment_config ENABLE ROW LEVEL SECURITY;

-- RLS policies: same governance as programmes
CREATE POLICY "Admins manage programme assessment config"
  ON public.programme_assessment_config FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'programme_manager'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'programme_manager'::app_role)
  );

CREATE POLICY "Authenticated read programme assessment config"
  ON public.programme_assessment_config FOR SELECT
  USING (true);

-- Timestamp trigger
CREATE TRIGGER update_programme_assessment_config_updated_at
  BEFORE UPDATE ON public.programme_assessment_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Add moderation_status to assessment_submissions for governance tracking
ALTER TABLE public.assessment_submissions
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS moderation_notes text;
