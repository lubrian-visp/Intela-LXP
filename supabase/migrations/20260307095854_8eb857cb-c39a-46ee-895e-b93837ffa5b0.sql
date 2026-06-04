
-- Function to check if a user can act on a workflow step instance
-- Checks: direct assignment, role match, OR delegated approval authority
CREATE OR REPLACE FUNCTION public.can_act_on_workflow_step(_user_id uuid, _step_instance_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _assigned_to uuid;
  _assigned_role text;
  _entity_type text;
  _entity_id uuid;
  _scope_value uuid;
BEGIN
  -- Get step instance assignment info
  SELECT si.assigned_to, si.assigned_role, wi.entity_type, wi.entity_id::uuid
  INTO _assigned_to, _assigned_role, _entity_type, _entity_id
  FROM workflow_step_instances si
  JOIN workflow_instances wi ON wi.id = si.instance_id
  WHERE si.id = _step_instance_id;

  IF NOT FOUND THEN RETURN false; END IF;

  -- 1. Directly assigned to this user
  IF _assigned_to = _user_id THEN RETURN true; END IF;

  -- 2. User holds the assigned role
  IF _assigned_role IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = _user_id AND role::text = _assigned_role
    ) THEN
      RETURN true;
    END IF;
  END IF;

  -- 3. User is a delegated approver (global or scoped to the entity's programme)
  -- Determine programme scope from entity
  IF _entity_type = 'programme' THEN
    _scope_value := _entity_id;
  ELSIF _entity_type = 'learner_registration' THEN
    SELECT programme_id INTO _scope_value
    FROM learner_registrations WHERE id = _entity_id;
  ELSIF _entity_type = 'assessment_submission' THEN
    SELECT a.programme_id INTO _scope_value
    FROM assessment_submissions asub
    JOIN assessments a ON a.id = asub.assessment_id
    WHERE asub.id = _entity_id;
  END IF;

  IF is_delegated_approver(_user_id, _scope_value) THEN
    RETURN true;
  END IF;

  -- 4. Super admin override
  IF is_platform_admin(_user_id) THEN RETURN true; END IF;

  RETURN false;
END;
$$;
