
-- Function to check if a user can approve a learner registration
-- Enforces: four-eyes principle, role-based access, programme scoping, delegation
CREATE OR REPLACE FUNCTION public.can_approve_registration(_user_id uuid, _registration_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _registered_by uuid;
  _programme_id uuid;
BEGIN
  -- Get registration details
  SELECT registered_by, programme_id INTO _registered_by, _programme_id
  FROM learner_registrations WHERE id = _registration_id;

  -- Four-eyes: cannot approve what you registered
  IF _registered_by IS NOT NULL AND _registered_by = _user_id THEN
    RETURN false;
  END IF;

  -- Super Admin: override/escalation authority
  IF has_role(_user_id, 'super_admin'::app_role) THEN
    RETURN true;
  END IF;

  -- Operations Control: global approval authority
  IF has_role(_user_id, 'operations'::app_role) THEN
    RETURN true;
  END IF;

  -- Programme Manager: only for their own programmes
  IF has_role(_user_id, 'programme_manager'::app_role) AND _programme_id IS NOT NULL THEN
    -- Check if this PM manages this programme (created it or is assigned via cohorts)
    IF EXISTS (
      SELECT 1 FROM programmes WHERE id = _programme_id AND created_by = _user_id
    ) THEN
      RETURN true;
    END IF;
    -- Also check if they facilitate any cohort for this programme
    IF EXISTS (
      SELECT 1 FROM cohorts WHERE programme_id = _programme_id AND facilitator_id = _user_id
    ) THEN
      RETURN true;
    END IF;
  END IF;

  -- Delegated approver: check delegated_approvers table
  IF is_delegated_approver(_user_id, _programme_id) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Add RLS policy allowing delegated approvers to update learner_registrations
CREATE POLICY "Delegated approvers can update registrations"
ON public.learner_registrations
FOR UPDATE
USING (
  is_delegated_approver(auth.uid(), programme_id)
)
WITH CHECK (
  is_delegated_approver(auth.uid(), programme_id)
);

-- Also allow delegated approvers to read registrations they can act on
CREATE POLICY "Delegated approvers can read registrations"
ON public.learner_registrations
FOR SELECT
USING (
  is_delegated_approver(auth.uid(), programme_id)
);
