
CREATE OR REPLACE FUNCTION public.sync_programme_type_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _type_id uuid;
BEGIN
  -- Determine which programme_type_id changed
  IF TG_OP = 'DELETE' THEN
    _type_id := OLD.programme_type_id;
  ELSIF TG_OP = 'INSERT' THEN
    _type_id := NEW.programme_type_id;
  ELSE
    -- UPDATE: handle type change
    IF OLD.programme_type_id IS DISTINCT FROM NEW.programme_type_id THEN
      -- Decrement old
      IF OLD.programme_type_id IS NOT NULL THEN
        UPDATE programme_types SET programme_count = GREATEST(0, (
          SELECT COUNT(*) FROM programmes WHERE programme_type_id = OLD.programme_type_id
        )) WHERE id = OLD.programme_type_id;
      END IF;
    END IF;
    _type_id := NEW.programme_type_id;
  END IF;

  IF _type_id IS NOT NULL THEN
    UPDATE programme_types SET programme_count = (
      SELECT COUNT(*) FROM programmes WHERE programme_type_id = _type_id
    ) WHERE id = _type_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_sync_programme_type_count
AFTER INSERT OR UPDATE OF programme_type_id OR DELETE
ON public.programmes
FOR EACH ROW
EXECUTE FUNCTION public.sync_programme_type_count();
