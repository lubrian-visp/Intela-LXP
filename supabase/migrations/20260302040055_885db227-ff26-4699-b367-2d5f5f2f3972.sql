
-- Disable only the user trigger, not system triggers
ALTER TABLE public.programmes DISABLE TRIGGER USER;
UPDATE public.programmes SET status = 'approved' WHERE id = '97d71a20-ef5b-4ae1-8970-5c72d9a399f3';
ALTER TABLE public.programmes ENABLE TRIGGER USER;
