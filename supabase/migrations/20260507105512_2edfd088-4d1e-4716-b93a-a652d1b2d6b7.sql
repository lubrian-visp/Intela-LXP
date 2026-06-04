-- 1. Sections table
CREATE TABLE IF NOT EXISTS public.quiz_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Section',
  description text,
  sequence_order integer NOT NULL DEFAULT 0,
  is_pool boolean NOT NULL DEFAULT false,
  pick_count integer,
  shuffle_questions boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_sections_assessment ON public.quiz_sections(assessment_id, sequence_order);

ALTER TABLE public.quiz_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read quiz_sections"
  ON public.quiz_sections FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff manage quiz_sections"
  ON public.quiz_sections FOR ALL TO authenticated
  USING (is_platform_admin(auth.uid()) OR has_role(auth.uid(),'programme_manager'::app_role) OR has_role(auth.uid(),'facilitator'::app_role))
  WITH CHECK (is_platform_admin(auth.uid()) OR has_role(auth.uid(),'programme_manager'::app_role) OR has_role(auth.uid(),'facilitator'::app_role));

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_quiz_sections_updated_at ON public.quiz_sections;
CREATE TRIGGER trg_quiz_sections_updated_at
  BEFORE UPDATE ON public.quiz_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Link questions to sections (optional)
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES public.quiz_sections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quiz_questions_section ON public.quiz_questions(section_id);

-- 3. Persist sampled questions per attempt
ALTER TABLE public.assessment_submissions
  ADD COLUMN IF NOT EXISTS selected_question_ids jsonb NOT NULL DEFAULT '[]'::jsonb;