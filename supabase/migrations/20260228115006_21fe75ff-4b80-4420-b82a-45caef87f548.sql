
-- ══════════════════════════════════════════════════════════════
-- 1. ENROLMENT TOGGLES (global / programme / cohort level)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE public.enrolment_toggles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_level text NOT NULL CHECK (scope_level IN ('global', 'programme', 'cohort')),
  scope_id uuid, -- NULL for global, programme_id or cohort_id
  is_enabled boolean NOT NULL DEFAULT false,
  reason text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope_level, scope_id)
);

ALTER TABLE public.enrolment_toggles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read enrolment toggles"
  ON public.enrolment_toggles FOR SELECT
  USING (true);

CREATE POLICY "Ops and admin manage enrolment toggles"
  ON public.enrolment_toggles FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role));

CREATE POLICY "Programme managers manage cohort toggles"
  ON public.enrolment_toggles FOR ALL
  USING (has_role(auth.uid(), 'programme_manager'::app_role) AND scope_level = 'cohort')
  WITH CHECK (has_role(auth.uid(), 'programme_manager'::app_role) AND scope_level = 'cohort');

-- Insert default global toggle (disabled)
INSERT INTO public.enrolment_toggles (scope_level, scope_id, is_enabled, reason)
VALUES ('global', NULL, false, 'Default: enrolment disabled until explicitly enabled');

-- ══════════════════════════════════════════════════════════════
-- 2. APPROVAL ROUTING RULES
-- ══════════════════════════════════════════════════════════════
CREATE TABLE public.approval_routing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  description text,
  scope_type text NOT NULL DEFAULT 'programme' CHECK (scope_type IN ('global', 'programme', 'region', 'department')),
  scope_value text, -- programme_id, region name, department name
  approver_user_id uuid, -- specific user
  approver_role text, -- or role-based
  step_order int NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.approval_routing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read approval routing rules"
  ON public.approval_routing_rules FOR SELECT
  USING (true);

CREATE POLICY "Admins manage approval routing rules"
  ON public.approval_routing_rules FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role));

-- ══════════════════════════════════════════════════════════════
-- 3. REGISTRATION APPROVAL STEPS (multi-level tracking)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE public.registration_approval_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.learner_registrations(id) ON DELETE CASCADE,
  step_order int NOT NULL DEFAULT 1,
  approver_user_id uuid,
  approver_role text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'returned')),
  reason text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.registration_approval_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage approval steps"
  ON public.registration_approval_steps FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role));

CREATE POLICY "Assigned approvers can update their steps"
  ON public.registration_approval_steps FOR UPDATE
  USING (approver_user_id = auth.uid());

CREATE POLICY "Assigned approvers can read their steps"
  ON public.registration_approval_steps FOR SELECT
  USING (approver_user_id = auth.uid());

-- ══════════════════════════════════════════════════════════════
-- 4. LEARNER ELIGIBILITY CHECKS (per-registration tracking)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE public.learner_eligibility_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.learner_registrations(id) ON DELETE CASCADE,
  check_type text NOT NULL CHECK (check_type IN ('registration_status', 'profile_complete', 'compliance_status', 'documents', 'account_status', 'not_already_enrolled', 'capacity_available', 'toggle_status')),
  is_passed boolean NOT NULL DEFAULT false,
  details text,
  checked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (registration_id, check_type)
);

ALTER TABLE public.learner_eligibility_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read eligibility checks"
  ON public.learner_eligibility_checks FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role));

CREATE POLICY "System manage eligibility checks"
  ON public.learner_eligibility_checks FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role));

-- ══════════════════════════════════════════════════════════════
-- 5. ADD TRIGGERS for updated_at
-- ══════════════════════════════════════════════════════════════
CREATE TRIGGER update_enrolment_toggles_updated_at
  BEFORE UPDATE ON public.enrolment_toggles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_approval_routing_rules_updated_at
  BEFORE UPDATE ON public.approval_routing_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_registration_approval_steps_updated_at
  BEFORE UPDATE ON public.registration_approval_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ══════════════════════════════════════════════════════════════
-- 6. NOTIFICATION TRIGGER for registration lifecycle events
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.notify_registration_status_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _title text;
  _body text;
  _user_id uuid;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  -- Try to find user by email for notification
  SELECT id INTO _user_id FROM auth.users WHERE email = NEW.email LIMIT 1;

  IF _user_id IS NULL THEN RETURN NEW; END IF;

  CASE NEW.status
    WHEN 'approved' THEN
      _title := 'Registration Approved';
      _body := 'Your registration has been approved. You are now ready for enrolment.';
    WHEN 'rejected' THEN
      _title := 'Registration Not Approved';
      _body := COALESCE('Your registration was not approved. Reason: ' || NEW.rejection_reason, 'Your registration was not approved.');
    WHEN 'returned_for_revision' THEN
      _title := 'Registration Returned for Revision';
      _body := COALESCE('Please revise your registration. Notes: ' || NEW.rejection_reason, 'Your registration requires revision.');
    WHEN 'enrolled' THEN
      _title := 'Enrolment Confirmed';
      _body := 'You have been enrolled in ' || COALESCE(NEW.programme_name, 'a programme') || '.';
    ELSE
      RETURN NEW;
  END CASE;

  INSERT INTO public.notifications (user_id, title, body, category, reference_table, reference_id, action_url)
  VALUES (_user_id, _title, _body, 'general', 'learner_registrations', NEW.id, '/learner/programmes');

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_registration_status
  AFTER UPDATE ON public.learner_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_registration_status_change();

-- ══════════════════════════════════════════════════════════════
-- 7. AUDIT TRIGGER for enrolment toggle changes
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.audit_enrolment_toggle_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.onboarding_audit_log (entity_type, entity_id, action, performed_by, details)
  VALUES (
    'enrolment_toggle',
    NEW.id,
    CASE WHEN NEW.is_enabled THEN 'toggle_enabled' ELSE 'toggle_disabled' END,
    NEW.changed_by,
    jsonb_build_object('scope_level', NEW.scope_level, 'scope_id', NEW.scope_id, 'reason', NEW.reason)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_enrolment_toggle
  AFTER INSERT OR UPDATE ON public.enrolment_toggles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_enrolment_toggle_change();
