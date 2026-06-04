-- Add metadata jsonb column for type-specific data on quiz questions
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Validation trigger: ensure question_type is one of the allowed values
CREATE OR REPLACE FUNCTION public.validate_quiz_question_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.question_type NOT IN (
    'multiple_choice','true_false','short_answer',
    'matching','ordering','fill_blank','numerical'
  ) THEN
    RAISE EXCEPTION 'Invalid question_type: %', NEW.question_type;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_quiz_question_type ON public.quiz_questions;
CREATE TRIGGER trg_validate_quiz_question_type
BEFORE INSERT OR UPDATE ON public.quiz_questions
FOR EACH ROW EXECUTE FUNCTION public.validate_quiz_question_type();