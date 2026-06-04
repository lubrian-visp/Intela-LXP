
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create a function to trigger email sending on new notification
CREATE OR REPLACE FUNCTION public.trigger_notification_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _url text;
  _key text;
BEGIN
  SELECT decrypted_secret INTO _url FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1;
  SELECT decrypted_secret INTO _key FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key' LIMIT 1;

  IF _url IS NOT NULL AND _key IS NOT NULL THEN
    PERFORM net.http_post(
      url := _url || '/functions/v1/send-notification-emails',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _key
      ),
      body := '{}'::jsonb
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on notifications table
CREATE TRIGGER on_notification_inserted
  AFTER INSERT ON public.notifications
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_notification_email();
