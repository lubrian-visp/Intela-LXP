ALTER TABLE public.quiz_sections
  ADD COLUMN IF NOT EXISTS source_bank_id uuid REFERENCES public.question_banks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS filter_tags text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS filter_difficulty text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS filter_question_types text[] DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS idx_quiz_sections_source_bank ON public.quiz_sections(source_bank_id);