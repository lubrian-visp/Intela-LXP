
-- ══════════════════════════════════════════════════════════════
-- Platform-wide Workflow Engine — Phase 1 Schema
-- ══════════════════════════════════════════════════════════════

-- Workflow Templates: reusable workflow definitions
CREATE TABLE public.workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  entity_type TEXT NOT NULL DEFAULT 'learner_registration',
  -- entity_type: learner_registration, programme, assessment_submission, staff_registration
  trigger_event TEXT NOT NULL DEFAULT 'on_create',
  -- trigger_event: on_create, on_status_change, manual
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  scope_type TEXT NOT NULL DEFAULT 'global',
  -- scope_type: global, programme, cohort
  scope_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workflow Steps: individual steps within a template
CREATE TABLE public.workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.workflow_templates(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  step_type TEXT NOT NULL DEFAULT 'approval',
  -- step_type: approval, notification, auto_action, condition, manual_task
  step_order INTEGER NOT NULL DEFAULT 1,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- config holds: assignee_role, assignee_user_id, action (update_status, send_email, assign_cohort),
  --   condition (field, operator, value), timeout_hours, on_timeout_action, required_fields
  next_step_on_approve UUID,
  next_step_on_reject UUID,
  is_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workflow Instances: runtime tracking of active workflows
CREATE TABLE public.workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.workflow_templates(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  current_step_id UUID REFERENCES public.workflow_steps(id),
  status TEXT NOT NULL DEFAULT 'active',
  -- status: active, completed, cancelled, failed, paused
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  started_by UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workflow Step Instances: runtime state of each step
CREATE TABLE public.workflow_step_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES public.workflow_instances(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.workflow_steps(id),
  status TEXT NOT NULL DEFAULT 'pending',
  -- status: pending, in_progress, completed, skipped, failed, timed_out
  assigned_to UUID,
  assigned_role TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  outcome TEXT,
  -- outcome: approved, rejected, returned, auto_completed
  reason TEXT,
  result_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workflow Audit Log
CREATE TABLE public.workflow_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES public.workflow_instances(id),
  step_instance_id UUID REFERENCES public.workflow_step_instances(id),
  action TEXT NOT NULL,
  performed_by UUID,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_workflow_templates_entity ON public.workflow_templates(entity_type, is_active);
CREATE INDEX idx_workflow_steps_template ON public.workflow_steps(template_id, step_order);
CREATE INDEX idx_workflow_instances_entity ON public.workflow_instances(entity_type, entity_id);
CREATE INDEX idx_workflow_instances_status ON public.workflow_instances(status);
CREATE INDEX idx_workflow_step_instances_instance ON public.workflow_step_instances(instance_id);
CREATE INDEX idx_workflow_step_instances_assigned ON public.workflow_step_instances(assigned_to, status);
CREATE INDEX idx_workflow_audit_instance ON public.workflow_audit_log(instance_id);

-- RLS
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_step_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_audit_log ENABLE ROW LEVEL SECURITY;

-- Templates: admin read/write
CREATE POLICY "Admin read workflow_templates" ON public.workflow_templates
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'operations'));

CREATE POLICY "Admin write workflow_templates" ON public.workflow_templates
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'operations'))
  WITH CHECK (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'operations'));

-- Steps: same as templates
CREATE POLICY "Admin read workflow_steps" ON public.workflow_steps
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workflow_templates wt WHERE wt.id = template_id
    AND (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'operations'))
  ));

CREATE POLICY "Admin write workflow_steps" ON public.workflow_steps
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'operations'))
  WITH CHECK (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'operations'));

-- Instances: admin + assigned users
CREATE POLICY "Read workflow_instances" ON public.workflow_instances
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR public.has_role(auth.uid(), 'operations')
    OR public.has_role(auth.uid(), 'programme_manager')
    OR started_by = auth.uid()
  );

CREATE POLICY "Write workflow_instances" ON public.workflow_instances
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'operations'))
  WITH CHECK (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'operations'));

-- Step Instances: admin + assigned
CREATE POLICY "Read workflow_step_instances" ON public.workflow_step_instances
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR public.has_role(auth.uid(), 'operations')
    OR public.has_role(auth.uid(), 'programme_manager')
    OR assigned_to = auth.uid()
  );

CREATE POLICY "Write workflow_step_instances" ON public.workflow_step_instances
  FOR ALL TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR public.has_role(auth.uid(), 'operations')
    OR assigned_to = auth.uid()
  )
  WITH CHECK (
    public.is_platform_admin(auth.uid())
    OR public.has_role(auth.uid(), 'operations')
    OR assigned_to = auth.uid()
  );

-- Audit log: read-only for admins
CREATE POLICY "Read workflow_audit_log" ON public.workflow_audit_log
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'operations'));

CREATE POLICY "Insert workflow_audit_log" ON public.workflow_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Updated_at triggers
CREATE TRIGGER trg_workflow_templates_updated BEFORE UPDATE ON public.workflow_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_workflow_steps_updated BEFORE UPDATE ON public.workflow_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_workflow_instances_updated BEFORE UPDATE ON public.workflow_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_workflow_step_instances_updated BEFORE UPDATE ON public.workflow_step_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for instances (live workflow tracking)
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_instances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_step_instances;
