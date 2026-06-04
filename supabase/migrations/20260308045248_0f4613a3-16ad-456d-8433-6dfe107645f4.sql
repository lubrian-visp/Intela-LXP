
-- Function: auto-issue credential when all programme assessments are competent
CREATE OR REPLACE FUNCTION public.auto_issue_credential_on_competent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _programme_id uuid;
  _enrolment_id uuid;
  _learner_id uuid;
  _total_assessments integer;
  _passed_assessments integer;
  _programme_title text;
  _already_issued boolean;
BEGIN
  -- Only trigger on status change to assessed/approved/passed
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('assessed', 'approved', 'passed') THEN
    RETURN NEW;
  END IF;

  _learner_id := NEW.learner_id;

  -- Get programme_id from the assessment
  SELECT a.programme_id INTO _programme_id
  FROM assessments a WHERE a.id = NEW.assessment_id;

  IF _programme_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get programme title
  SELECT title INTO _programme_title FROM programmes WHERE id = _programme_id;

  -- Count total assessments for this programme
  SELECT COUNT(*) INTO _total_assessments
  FROM assessments WHERE programme_id = _programme_id;

  IF _total_assessments = 0 THEN
    RETURN NEW;
  END IF;

  -- Count how many the learner has passed (score >= pass_mark)
  SELECT COUNT(*) INTO _passed_assessments
  FROM assessment_submissions sub
  JOIN assessments a ON a.id = sub.assessment_id
  WHERE a.programme_id = _programme_id
    AND sub.learner_id = _learner_id
    AND sub.status IN ('assessed', 'approved', 'passed')
    AND (
      (sub.score IS NOT NULL AND a.pass_mark IS NOT NULL AND sub.score >= a.pass_mark)
      OR (a.pass_mark IS NULL AND sub.status IN ('approved', 'passed'))
    );

  -- Check if all assessments are passed
  IF _passed_assessments < _total_assessments THEN
    RETURN NEW;
  END IF;

  -- Check if credential already issued for this learner + programme
  SELECT EXISTS (
    SELECT 1 FROM issued_credentials
    WHERE learner_id = _learner_id AND programme_id = _programme_id
  ) INTO _already_issued;

  IF _already_issued THEN
    RETURN NEW;
  END IF;

  -- Find the learner's enrolment for this programme
  SELECT e.id INTO _enrolment_id
  FROM enrolments e
  JOIN cohorts c ON c.id = e.cohort_id
  WHERE e.learner_id = _learner_id
    AND c.programme_id = _programme_id
  ORDER BY e.created_at DESC
  LIMIT 1;

  IF _enrolment_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Auto-issue the credential
  INSERT INTO issued_credentials (
    learner_id, programme_id, enrolment_id, title,
    credential_type, status, issued_at, issued_by
  ) VALUES (
    _learner_id, _programme_id, _enrolment_id,
    COALESCE(_programme_title, 'Programme') || ' - Certificate of Competence',
    'certificate', 'active', now(), auth.uid()
  );

  -- Notify the learner
  INSERT INTO notifications (user_id, title, body, category, reference_table, reference_id, action_url)
  VALUES (
    _learner_id,
    'Credential Issued: ' || COALESCE(_programme_title, 'Programme'),
    'Congratulations! You have been assessed as competent in all assessments and a credential has been issued.',
    'general',
    'issued_credentials',
    _enrolment_id,
    '/credentials'
  );

  RETURN NEW;
END;
$$;

-- Attach trigger to assessment_submissions
CREATE TRIGGER trg_auto_issue_credential
  AFTER UPDATE ON assessment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION auto_issue_credential_on_competent();
