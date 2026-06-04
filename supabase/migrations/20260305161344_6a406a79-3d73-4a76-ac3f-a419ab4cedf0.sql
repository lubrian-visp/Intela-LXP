
CREATE OR REPLACE FUNCTION public.auto_sample_for_moderation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _learner_count integer;
  _should_sample boolean := false;
  _threshold integer;
  _sample_pct numeric;
  _reason text;
BEGIN
  -- Only trigger when status actually changes
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('assessed', 'graded', 'passed') THEN
    RETURN NEW;
  END IF;

  -- Read dynamic settings from platform_settings
  SELECT COALESCE(setting_value::integer, 10) INTO _threshold
  FROM public.platform_settings
  WHERE setting_key = 'moderation_learner_threshold'
  LIMIT 1;

  IF _threshold IS NULL THEN _threshold := 10; END IF;

  SELECT COALESCE(setting_value::numeric, 25) INTO _sample_pct
  FROM public.platform_settings
  WHERE setting_key = 'moderation_sample_percentage'
  LIMIT 1;

  IF _sample_pct IS NULL THEN _sample_pct := 25; END IF;

  -- Count distinct learners in the same programme
  SELECT COUNT(DISTINCT es.learner_id) INTO _learner_count
  FROM public.assessment_submissions es
  JOIN public.assessments a2 ON a2.id = es.assessment_id
  WHERE a2.programme_id = (
    SELECT programme_id FROM public.assessments WHERE id = NEW.assessment_id
  );

  -- Apply sampling logic
  IF _learner_count <= _threshold THEN
    _should_sample := true;
    _reason := 'Mandatory moderation (' || _learner_count || ' learners, threshold: ' || _threshold || ')';
  ELSE
    IF random() < (_sample_pct / 100.0) THEN
      _should_sample := true;
      _reason := 'Random ' || _sample_pct || '% quality sampling (' || _learner_count || ' learners)';
    END IF;
  END IF;

  IF _should_sample THEN
    NEW.moderation_status := 'pending';

    INSERT INTO public.moderation_items (
      item_type, content, reason, priority, status,
      submitted_by, programme_id
    )
    SELECT
      'assessment_submission',
      'Auto-sampled submission for "' || COALESCE(a.title, 'Assessment') || '" - Score: ' || COALESCE(NEW.score::text, 'N/A'),
      _reason,
      CASE
        WHEN NEW.score IS NOT NULL AND a.pass_mark IS NOT NULL AND NEW.score < a.pass_mark THEN 'high'
        WHEN _learner_count <= _threshold THEN 'high'
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
