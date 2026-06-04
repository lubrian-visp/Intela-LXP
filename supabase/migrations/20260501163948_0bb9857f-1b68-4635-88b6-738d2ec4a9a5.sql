-- Extend moderation auto-routing to honour the assessment's `requires_moderation` flag.
-- When set, EVERY graded submission is routed to the moderation queue (mandatory 4-Eyes),
-- regardless of sampling thresholds. Otherwise the existing sampling logic applies.

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
  _priority text := 'medium';
  _requires_moderation boolean := false;
  _programme_id uuid;
  _assessment_title text;
  _pass_mark numeric;
  _existing_id uuid;
BEGIN
  -- Only on status change
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('assessed', 'graded', 'passed', 'failed') THEN
    RETURN NEW;
  END IF;

  -- Pull assessment-level config
  SELECT a.programme_id, a.title, a.pass_mark, COALESCE(a.requires_moderation, false)
    INTO _programme_id, _assessment_title, _pass_mark, _requires_moderation
  FROM public.assessments a WHERE a.id = NEW.assessment_id;

  -- Skip if a moderation item already exists for this submission
  SELECT id INTO _existing_id
  FROM public.moderation_items
  WHERE submission_id = NEW.id
  LIMIT 1;

  IF _existing_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- BRANCH 1: Mandatory moderation (4-Eyes flag on assessment)
  IF _requires_moderation THEN
    _should_sample := true;
    _reason := 'Mandatory 4-Eyes moderation (assessment requires_moderation = true)';
    _priority := 'high';
  ELSE
    -- BRANCH 2: Existing sampling logic
    SELECT COALESCE(setting_value::integer, 10) INTO _threshold
    FROM public.platform_settings WHERE setting_key = 'moderation_learner_threshold' LIMIT 1;
    IF _threshold IS NULL THEN _threshold := 10; END IF;

    SELECT COALESCE(setting_value::numeric, 25) INTO _sample_pct
    FROM public.platform_settings WHERE setting_key = 'moderation_sample_percentage' LIMIT 1;
    IF _sample_pct IS NULL THEN _sample_pct := 25; END IF;

    SELECT COUNT(DISTINCT es.learner_id) INTO _learner_count
    FROM public.assessment_submissions es
    JOIN public.assessments a2 ON a2.id = es.assessment_id
    WHERE a2.programme_id = _programme_id;

    IF _learner_count <= _threshold THEN
      _should_sample := true;
      _reason := 'Mandatory moderation (' || _learner_count || ' learners, threshold: ' || _threshold || ')';
      _priority := 'high';
    ELSIF random() < (_sample_pct / 100.0) THEN
      _should_sample := true;
      _reason := 'Random ' || _sample_pct || '% quality sampling (' || _learner_count || ' learners)';
      _priority := CASE
        WHEN NEW.score IS NOT NULL AND _pass_mark IS NOT NULL AND NEW.score < _pass_mark THEN 'high'
        ELSE 'medium'
      END;
    END IF;
  END IF;

  IF _should_sample THEN
    NEW.moderation_status := 'pending';

    INSERT INTO public.moderation_items (
      item_type, content, reason, priority, status,
      submitted_by, programme_id, submission_id
    ) VALUES (
      'assessment_submission',
      'Submission for "' || COALESCE(_assessment_title, 'Assessment') || '" — Score: ' || COALESCE(NEW.score::text, 'N/A'),
      _reason,
      _priority,
      'pending',
      NEW.assessor_id,
      _programme_id,
      NEW.id
    );

    -- Notify available moderators (role='moderator') scoped to programme if any, else all
    INSERT INTO public.notifications (user_id, title, body, category, reference_table, reference_id, action_url)
    SELECT ur.user_id,
      'Moderation Required: ' || COALESCE(_assessment_title, 'Assessment'),
      _reason,
      'approval',
      'moderation_items',
      NEW.id,
      '/moderator/queue'
    FROM public.user_roles ur
    WHERE ur.role IN ('moderator', 'super_admin')
      AND ur.user_id IS DISTINCT FROM NEW.assessor_id; -- 4-Eyes: never notify the assessor themselves
  END IF;

  RETURN NEW;
END;
$function$;

-- Ensure trigger exists on assessment_submissions (BEFORE UPDATE so moderation_status is set on the row)
DROP TRIGGER IF EXISTS trg_auto_sample_for_moderation ON public.assessment_submissions;
CREATE TRIGGER trg_auto_sample_for_moderation
BEFORE UPDATE ON public.assessment_submissions
FOR EACH ROW
EXECUTE FUNCTION public.auto_sample_for_moderation();