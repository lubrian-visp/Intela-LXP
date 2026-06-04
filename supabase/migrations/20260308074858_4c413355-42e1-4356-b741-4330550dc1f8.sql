
-- Add moderation feedback columns
ALTER TABLE public.moderation_items
  ADD COLUMN IF NOT EXISTS moderation_feedback text,
  ADD COLUMN IF NOT EXISTS rejection_category text,
  ADD COLUMN IF NOT EXISTS submission_id uuid REFERENCES public.assessment_submissions(id);

-- Trigger: notify assessor when moderation item is rejected
CREATE OR REPLACE FUNCTION public.notify_assessor_on_moderation_rejection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assessor_id uuid;
  v_title text;
BEGIN
  -- Only fire on status change to rejected
  IF NEW.status = 'rejected' AND (OLD.status IS DISTINCT FROM 'rejected') THEN
    -- Look up the assessor from the linked submission
    IF NEW.submission_id IS NOT NULL THEN
      SELECT as2.assessor_id, a.title
        INTO v_assessor_id, v_title
        FROM assessment_submissions as2
        JOIN assessments a ON a.id = as2.assessment_id
       WHERE as2.id = NEW.submission_id;

      IF v_assessor_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
        VALUES (
          v_assessor_id,
          'Moderation Rejection',
          'Your grading for "' || COALESCE(v_title, 'an assessment') || '" was rejected. Reason: ' || COALESCE(NEW.rejection_category, 'Not specified') || '. ' || COALESCE(NEW.moderation_feedback, ''),
          'moderation',
          NEW.id,
          'moderation_items'
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_assessor_on_rejection ON public.moderation_items;
CREATE TRIGGER trg_notify_assessor_on_rejection
  AFTER UPDATE ON public.moderation_items
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_assessor_on_moderation_rejection();
