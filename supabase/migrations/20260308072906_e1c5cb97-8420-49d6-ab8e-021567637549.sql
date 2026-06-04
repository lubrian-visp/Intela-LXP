
-- Add QR token and late tracking to session_attendance
ALTER TABLE public.session_attendance
  ADD COLUMN IF NOT EXISTS qr_token text,
  ADD COLUMN IF NOT EXISTS late_minutes integer DEFAULT 0;

-- Add QR check-in toggle to training_sessions
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS qr_checkin_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS qr_token text DEFAULT encode(gen_random_bytes(16), 'hex');

-- Create a function to auto-calculate late_minutes on check-in
CREATE OR REPLACE FUNCTION public.calculate_late_minutes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _scheduled_start timestamptz;
  _diff_minutes integer;
BEGIN
  -- Only calculate on insert or when checked_in_at changes
  IF NEW.checked_in_at IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT scheduled_start INTO _scheduled_start
  FROM training_sessions
  WHERE id = NEW.session_id;

  IF _scheduled_start IS NULL THEN
    RETURN NEW;
  END IF;

  _diff_minutes := EXTRACT(EPOCH FROM (NEW.checked_in_at::timestamptz - _scheduled_start)) / 60;

  IF _diff_minutes > 0 THEN
    NEW.late_minutes := _diff_minutes;
    NEW.status := CASE WHEN _diff_minutes > 15 THEN 'late' ELSE 'present' END;
  ELSE
    NEW.late_minutes := 0;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for late calculation
DROP TRIGGER IF EXISTS trg_calculate_late_minutes ON public.session_attendance;
CREATE TRIGGER trg_calculate_late_minutes
  BEFORE INSERT OR UPDATE OF checked_in_at ON public.session_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_late_minutes();
