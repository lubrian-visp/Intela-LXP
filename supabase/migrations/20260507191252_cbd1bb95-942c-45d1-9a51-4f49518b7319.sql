
-- Branching rules per question
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS branching_rules jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Extend question type validation trigger to allow new types
CREATE OR REPLACE FUNCTION public.validate_quiz_question_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  m jsonb := COALESCE(NEW.metadata, '{}'::jsonb);
BEGIN
  IF NEW.question_type NOT IN (
    'multiple_choice','true_false','short_answer',
    'matching','ordering','fill_blank','numerical',
    'hotspot','drag_drop','code','formula'
  ) THEN
    RAISE EXCEPTION 'Invalid question_type: %', NEW.question_type;
  END IF;

  IF NEW.question_type = 'matching' THEN
    IF NOT (m ? 'pairs') OR jsonb_typeof(m->'pairs') <> 'array' THEN
      RAISE EXCEPTION 'matching requires metadata.pairs array';
    END IF;
  ELSIF NEW.question_type = 'ordering' THEN
    IF NOT (m ? 'items') OR jsonb_typeof(m->'items') <> 'array' THEN
      RAISE EXCEPTION 'ordering requires metadata.items array';
    END IF;
  ELSIF NEW.question_type = 'fill_blank' THEN
    IF NOT (m ? 'blanks') OR jsonb_typeof(m->'blanks') <> 'array' THEN
      RAISE EXCEPTION 'fill_blank requires metadata.blanks array';
    END IF;
  ELSIF NEW.question_type = 'numerical' THEN
    IF NOT (m ? 'answer') THEN
      RAISE EXCEPTION 'numerical requires metadata.answer';
    END IF;
  ELSIF NEW.question_type = 'hotspot' THEN
    IF NOT (m ? 'image_url') OR NOT (m ? 'hotspots') OR jsonb_typeof(m->'hotspots') <> 'array' THEN
      RAISE EXCEPTION 'hotspot requires metadata.image_url and metadata.hotspots array';
    END IF;
  ELSIF NEW.question_type = 'drag_drop' THEN
    IF NOT (m ? 'items') OR NOT (m ? 'targets') THEN
      RAISE EXCEPTION 'drag_drop requires metadata.items and metadata.targets';
    END IF;
  ELSIF NEW.question_type = 'code' THEN
    IF NOT (m ? 'language') THEN
      RAISE EXCEPTION 'code requires metadata.language';
    END IF;
  ELSIF NEW.question_type = 'formula' THEN
    IF NOT (m ? 'expression') THEN
      RAISE EXCEPTION 'formula requires metadata.expression';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
