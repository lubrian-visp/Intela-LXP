
-- Function to notify users when a workflow step becomes actionable
CREATE OR REPLACE FUNCTION public.notify_workflow_step_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _instance record;
  _step record;
  _template_name text;
  _target_user_id uuid;
  _notification_title text;
  _notification_body text;
  _scope_value uuid;
BEGIN
  -- Only fire when status changes TO in_progress
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
  IF NEW.status <> 'in_progress' THEN RETURN NEW; END IF;

  -- Get workflow instance + template info
  SELECT wi.*, wt.name AS template_name, wt.entity_type AS tpl_entity_type
  INTO _instance
  FROM workflow_instances wi
  JOIN workflow_templates wt ON wt.id = wi.template_id
  WHERE wi.id = NEW.instance_id;

  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Get step definition
  SELECT * INTO _step
  FROM workflow_steps WHERE id = NEW.step_id;

  _template_name := _instance.template_name;
  _notification_title := 'Action Required: ' || COALESCE(_step.step_name, 'Workflow Step');
  _notification_body := 'You have a pending ' || COALESCE(_step.step_type, 'task') || ' step in workflow "' || _template_name || '".';

  -- 1. Notify directly assigned user
  IF NEW.assigned_to IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, body, category, reference_table, reference_id, action_url)
    VALUES (NEW.assigned_to, _notification_title, _notification_body, 'approval', 'workflow_step_instances', NEW.id, '/workflow-manager');
  END IF;

  -- 2. Notify all users with the assigned role
  IF NEW.assigned_role IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, body, category, reference_table, reference_id, action_url)
    SELECT ur.user_id, _notification_title, _notification_body, 'approval', 'workflow_step_instances', NEW.id, '/workflow-manager'
    FROM user_roles ur
    WHERE ur.role::text = NEW.assigned_role
      AND ur.user_id IS DISTINCT FROM NEW.assigned_to; -- avoid duplicate if also directly assigned
  END IF;

  -- 3. Notify delegated approvers scoped to the entity's programme
  -- Determine programme scope
  _scope_value := NULL;
  IF _instance.tpl_entity_type = 'programme' THEN
    _scope_value := _instance.entity_id::uuid;
  ELSIF _instance.tpl_entity_type = 'learner_registration' THEN
    SELECT programme_id INTO _scope_value FROM learner_registrations WHERE id = _instance.entity_id::uuid;
  ELSIF _instance.tpl_entity_type = 'assessment_submission' THEN
    SELECT a.programme_id INTO _scope_value
    FROM assessment_submissions asub
    JOIN assessments a ON a.id = asub.assessment_id
    WHERE asub.id = _instance.entity_id::uuid;
  END IF;

  INSERT INTO notifications (user_id, title, body, category, reference_table, reference_id, action_url)
  SELECT da.delegated_user_id,
         'Delegated Action: ' || COALESCE(_step.step_name, 'Workflow Step'),
         'As a delegated approver, you can act on a step in workflow "' || _template_name || '".',
         'approval', 'workflow_step_instances', NEW.id, '/workflow-manager'
  FROM delegated_approvers da
  WHERE da.is_active = true
    AND (da.expires_at IS NULL OR da.expires_at > now())
    AND (
      da.scope_type = 'global'
      OR (da.scope_type = 'programme' AND da.scope_value = _scope_value)
    )
    AND da.delegated_user_id IS DISTINCT FROM NEW.assigned_to; -- avoid duplicate

  RETURN NEW;
END;
$$;

-- Create the trigger on workflow_step_instances
CREATE TRIGGER trg_notify_workflow_step_assigned
  AFTER UPDATE ON workflow_step_instances
  FOR EACH ROW
  EXECUTE FUNCTION notify_workflow_step_assigned();

-- Also fire on INSERT for the first step (created as in_progress)
CREATE TRIGGER trg_notify_workflow_step_assigned_insert
  AFTER INSERT ON workflow_step_instances
  FOR EACH ROW
  WHEN (NEW.status = 'in_progress')
  EXECUTE FUNCTION notify_workflow_step_assigned();
