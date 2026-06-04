
-- 1. Notify operations & programme_manager when a new learner registration is submitted
CREATE OR REPLACE FUNCTION public.notify_staff_on_learner_registration()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notifications (user_id, title, body, category, reference_table, reference_id, action_url)
  SELECT ur.user_id,
    'New Learner Registration: ' || LEFT(NEW.full_name, 50),
    'A new learner (' || NEW.email || ') has registered for ' || COALESCE(NEW.programme_name, 'a programme') || '. Method: ' || COALESCE(NEW.registration_method, 'manual') || '.',
    'general',
    'learner_registrations',
    NEW.id,
    '/learner-onboarding'
  FROM public.user_roles ur
  WHERE ur.role IN ('operations', 'programme_manager', 'super_admin')
    AND ur.user_id IS DISTINCT FROM NEW.registered_by;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_notify_staff_on_learner_registration
  AFTER INSERT ON public.learner_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_staff_on_learner_registration();

-- 2. Notify super_admin & operations when a new staff registration is submitted
CREATE OR REPLACE FUNCTION public.notify_admins_on_staff_registration()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notifications (user_id, title, body, category, reference_table, reference_id, action_url)
  SELECT ur.user_id,
    'New Staff Registration: ' || LEFT(NEW.full_name, 50),
    'A new staff member (' || NEW.email || ') has been registered and requires verification.',
    'general',
    'staff_registrations',
    NEW.id,
    '/staff-onboarding'
  FROM public.user_roles ur
  WHERE ur.role IN ('operations', 'super_admin')
    AND ur.user_id IS DISTINCT FROM NEW.registered_by;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_notify_admins_on_staff_registration
  AFTER INSERT ON public.staff_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_staff_registration();

-- 3. Notify staff member when their registration is approved or rejected
CREATE OR REPLACE FUNCTION public.notify_staff_on_approval()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  SELECT id INTO _user_id FROM auth.users WHERE email = NEW.email LIMIT 1;
  IF _user_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.status = 'approved' THEN
    INSERT INTO public.notifications (user_id, title, body, category, action_url)
    VALUES (
      _user_id,
      'Welcome! Your Staff Registration is Approved',
      'Your registration has been verified and approved. You now have portal access.',
      'general',
      '/dashboard'
    );
  ELSIF NEW.status = 'rejected' THEN
    INSERT INTO public.notifications (user_id, title, body, category, action_url)
    VALUES (
      _user_id,
      'Staff Registration Not Approved',
      COALESCE('Your registration was not approved. Reason: ' || NEW.rejection_reason, 'Your registration was not approved. Please contact administration.'),
      'general',
      '/dashboard'
    );
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_notify_staff_on_approval
  AFTER UPDATE ON public.staff_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_staff_on_approval();
