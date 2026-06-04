
-- 5% moderation sampling trigger
-- When an assessment_submission is marked as 'assessed', randomly select ~5% for moderation
CREATE OR REPLACE FUNCTION public.auto_sample_for_moderation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only trigger when status changes to 'assessed' or 'graded'
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('assessed', 'graded', 'passed') THEN
    RETURN NEW;
  END IF;

  -- ~5% random sampling (1 in 20 chance)
  IF random() < 0.05 THEN
    -- Mark submission for moderation
    NEW.moderation_status := 'pending';

    -- Create a moderation item for the moderator queue
    INSERT INTO public.moderation_items (
      item_type, content, reason, priority, status,
      submitted_by, programme_id
    )
    SELECT
      'assessment_submission',
      'Auto-sampled submission for "' || COALESCE(a.title, 'Assessment') || '" - Score: ' || COALESCE(NEW.score::text, 'N/A'),
      'Automated 5% quality sampling',
      CASE
        WHEN NEW.score IS NOT NULL AND a.pass_mark IS NOT NULL AND NEW.score < a.pass_mark THEN 'high'
        ELSE 'medium'
      END,
      'pending',
      NEW.assessor_id,
      a.programme_id
    FROM public.assessments a
    WHERE a.id = NEW.assessment_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on assessment_submissions
DROP TRIGGER IF EXISTS trg_auto_sample_moderation ON public.assessment_submissions;
CREATE TRIGGER trg_auto_sample_moderation
  BEFORE UPDATE ON public.assessment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_sample_for_moderation();
