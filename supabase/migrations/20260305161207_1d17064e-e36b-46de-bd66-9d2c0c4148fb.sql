
CREATE OR REPLACE FUNCTION public.auto_sample_for_moderation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _learner_count integer;
  _should_sample boolean := false;
BEGIN
  -- Only trigger when status actually changes
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('assessed', 'graded', 'passed') THEN
    RETURN NEW;
  END IF;

  -- Count distinct learners in the same programme via the assessment
  SELECT COUNT(DISTINCT es.learner_id) INTO _learner_count
  FROM public.assessment_submissions es
  JOIN public.assessments a2 ON a2.id = es.assessment_id
  WHERE a2.programme_id = (
    SELECT programme_id FROM public.assessments WHERE id = NEW.assessment_id
  );

  -- If 10 or fewer learners: moderate ALL submissions
  IF _learner_count <= 10 THEN
    _should_sample := true;
  ELSE
    -- More than 10 learners: 25% random sampling
    IF random() < 0.25 THEN
      _should_sample := true;
    END IF;
  END IF;

  IF _should_sample THEN
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
      CASE
        WHEN _learner_count <= 10 THEN 'Mandatory moderation (10 or fewer learners)'
        ELSE 'Automated 25% quality sampling'
      END,
      CASE
        WHEN NEW.score IS NOT NULL AND a.pass_mark IS NOT NULL AND NEW.score < a.pass_mark THEN 'high'
        WHEN _learner_count <= 10 THEN 'high'
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
$function$;
