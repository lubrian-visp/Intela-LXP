
-- Add new lifecycle statuses to programmes (pending_approval, rejected, suspended)
-- These are handled by the existing 'status' text column, no schema change needed.

-- Ensure the governance trigger exists on programmes
CREATE OR REPLACE FUNCTION public.enforce_programme_governance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only enforce on status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Submitted → Approved or Submitted → Rejected: enforce four-eyes
  IF OLD.status = 'submitted' AND NEW.status IN ('approved', 'rejected') THEN
    IF NOT can_approve_programme(auth.uid(), NEW.id) THEN
      RAISE EXCEPTION 'Governance violation: you cannot approve/reject a programme you created, or you lack approval authority.';
    END IF;
  END IF;

  -- Approved → Published: only super_admin or operations
  IF OLD.status = 'approved' AND NEW.status = 'published' THEN
    IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role)) THEN
      RAISE EXCEPTION 'Only Super Admin or Ops Control may publish a programme.';
    END IF;
  END IF;

  -- Suspend: only super_admin
  IF NEW.status = 'suspended' THEN
    IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
      RAISE EXCEPTION 'Only Super Admin may suspend a programme.';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS trg_enforce_programme_governance ON public.programmes;
CREATE TRIGGER trg_enforce_programme_governance
  BEFORE UPDATE ON public.programmes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_programme_governance();
