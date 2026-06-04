
-- Fix governance trigger first to handle DELETE and pending_approval state
CREATE OR REPLACE FUNCTION public.enforce_programme_governance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only enforce on UPDATE status changes, not on DELETE
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  -- Only enforce on status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- pending_approval or submitted → Approved or Rejected: enforce four-eyes
  IF OLD.status IN ('submitted', 'pending_approval') AND NEW.status IN ('approved', 'rejected') THEN
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

-- Expand enrolments policy
DROP POLICY IF EXISTS "Admins manage enrolments" ON public.enrolments;
CREATE POLICY "Admins manage enrolments" ON public.enrolments
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'programme_manager'::app_role) OR
  has_role(auth.uid(), 'operations'::app_role) OR
  has_role(auth.uid(), 'systems_admin'::app_role) OR
  has_role(auth.uid(), 'facilitator'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'programme_manager'::app_role) OR
  has_role(auth.uid(), 'operations'::app_role) OR
  has_role(auth.uid(), 'systems_admin'::app_role) OR
  has_role(auth.uid(), 'facilitator'::app_role)
);
