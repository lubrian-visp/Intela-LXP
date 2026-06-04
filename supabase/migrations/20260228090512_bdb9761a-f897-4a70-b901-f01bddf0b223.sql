
-- Notification preferences table
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  in_app_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own preferences"
ON public.notification_preferences FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users insert own preferences"
ON public.notification_preferences FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own preferences"
ON public.notification_preferences FOR UPDATE
USING (user_id = auth.uid());

CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update notification triggers to respect preferences
CREATE OR REPLACE FUNCTION public.notify_enrolment_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  -- Check if user has disabled in-app for 'general' category
  IF EXISTS (
    SELECT 1 FROM notification_preferences
    WHERE user_id = NEW.learner_id AND category = 'general' AND in_app_enabled = false
  ) THEN
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
    'general', 'enrolments', NEW.id, '/learner/programmes'
  );
  RETURN NEW;
END;
$$;
