
-- Function: Notify learner on enrolment status change
CREATE OR REPLACE FUNCTION public.notify_enrolment_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, title, body, category, reference_table, reference_id, action_url)
  VALUES (
    NEW.learner_id,
    CASE
      WHEN NEW.status = 'active' THEN 'Enrolment Approved'
      WHEN NEW.status = 'enrolled' THEN 'You have been enrolled'
      WHEN NEW.status = 'completed' THEN 'Programme Completed!'
      WHEN NEW.status = 'suspended' THEN 'Enrolment Suspended'
      WHEN NEW.status = 'rejected' THEN 'Enrolment Rejected'
      ELSE 'Enrolment Updated'
    END,
    CASE
      WHEN NEW.status = 'active' THEN 'Your enrolment has been approved. You can now access your programme.'
      WHEN NEW.status = 'completed' THEN 'Congratulations! You have completed your programme.'
      WHEN NEW.status = 'suspended' THEN 'Your enrolment has been suspended. Please contact your programme manager.'
      WHEN NEW.status = 'rejected' THEN 'Your enrolment application was not approved.'
      ELSE 'Your enrolment status has been updated to ' || NEW.status || '.'
    END,
    'general',
    'enrolments',
    NEW.id,
    '/learner/programmes'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_enrolment_status
  AFTER UPDATE ON public.enrolments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_enrolment_status_change();

-- Function: Notify on approval task decision
CREATE OR REPLACE FUNCTION public.notify_approval_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.requested_by IS NOT NULL AND NEW.status IN ('approved', 'rejected') THEN
    INSERT INTO public.notifications (user_id, title, body, category, reference_table, reference_id, action_url)
    VALUES (
      NEW.requested_by,
      CASE WHEN NEW.status = 'approved' THEN 'Approval Granted: ' ELSE 'Request Rejected: ' END || LEFT(NEW.title, 60),
      COALESCE(NEW.notes, 'Your request has been ' || NEW.status || '.'),
      'approval',
      NEW.reference_table,
      NEW.reference_id,
      '/approval-queue'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_approval_decision
  AFTER UPDATE ON public.approval_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_approval_decision();

-- Function: Notify learner when assessment is graded
CREATE OR REPLACE FUNCTION public.notify_assessment_graded()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _title text;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('graded', 'assessed', 'passed', 'failed') THEN
    RETURN NEW;
  END IF;

  SELECT title INTO _title FROM public.assessments WHERE id = NEW.assessment_id;

  INSERT INTO public.notifications (user_id, title, body, category, reference_table, reference_id, action_url)
  VALUES (
    NEW.learner_id,
    'Assessment Graded: ' || COALESCE(_title, 'Assessment'),
    CASE
      WHEN NEW.score IS NOT NULL THEN 'You scored ' || NEW.score || '. ' || COALESCE(NEW.feedback, '')
      ELSE COALESCE(NEW.feedback, 'Your assessment has been reviewed.')
    END,
    'submission',
    'assessment_submissions',
    NEW.id,
    '/learner/assessments'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_assessment_graded
  AFTER UPDATE ON public.assessment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_assessment_graded();

-- Function: Notify assigned user on new approval task
CREATE OR REPLACE FUNCTION public.notify_new_approval_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body, category, reference_table, reference_id, action_url)
    VALUES (
      NEW.assigned_to,
      'New Approval Request: ' || LEFT(NEW.title, 60),
      COALESCE(NEW.description, 'A new item requires your review.'),
      'approval',
      NEW.reference_table,
      NEW.reference_id,
      '/approval-queue'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_approval_task
  AFTER INSERT ON public.approval_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_approval_task();
