
-- ============================================================
-- PHASE 1+2: Programme Governance — Schema & DB Functions
-- ============================================================

-- 1. Immutable Programme Lifecycle Audit Log
CREATE TABLE public.programme_lifecycle_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id uuid NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  performed_by uuid NOT NULL,
  role_at_action text NOT NULL,
  action text NOT NULL,            -- 'created','submitted','approved','rejected','suspended','archived','override_reversed','delegation_assigned','delegation_revoked'
  previous_status text,
  new_status text,
  reason text,                     -- mandatory for approve/reject/override/suspend
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- No UPDATE or DELETE policies — immutable
ALTER TABLE public.programme_lifecycle_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized roles read audit"
  ON public.programme_lifecycle_audit FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
    OR has_role(auth.uid(), 'systems_admin'::app_role)
  );

CREATE POLICY "Authenticated insert audit"
  ON public.programme_lifecycle_audit FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Index for fast programme-scoped queries
CREATE INDEX idx_programme_lifecycle_audit_programme
  ON public.programme_lifecycle_audit(programme_id, created_at DESC);


-- 2. Delegated Approvers Table
CREATE TABLE public.delegated_approvers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delegated_user_id uuid NOT NULL,
  assigned_by uuid NOT NULL,
  scope_type text NOT NULL DEFAULT 'global',   -- 'global','programme','cohort'
  scope_value uuid,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  revoked_at timestamptz,
  revoked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.delegated_approvers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ops and super_admin manage delegations"
  ON public.delegated_approvers FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
  );

CREATE POLICY "Delegated users read own"
  ON public.delegated_approvers FOR SELECT
  USING (delegated_user_id = auth.uid());


-- 3. Security-definer: Check permission flags from role_permissions
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _resource text, _action text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_role_scopes urs
    JOIN role_permissions rp ON rp.role_definition_id = urs.role_definition_id
    WHERE urs.user_id = _user_id
      AND urs.is_active = true
      AND rp.resource = _resource
      AND rp.action = _action
      AND rp.is_granted = true
  )
$$;


-- 4. Security-definer: Check if user is an active delegated approver
CREATE OR REPLACE FUNCTION public.is_delegated_approver(_user_id uuid, _programme_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM delegated_approvers da
    WHERE da.delegated_user_id = _user_id
      AND da.is_active = true
      AND (da.expires_at IS NULL OR da.expires_at > now())
      AND (
        da.scope_type = 'global'
        OR (da.scope_type = 'programme' AND da.scope_value = _programme_id)
      )
  )
$$;


-- 5. Security-definer: Four-eyes principle enforcement
--    Returns true if _user_id is allowed to approve _programme_id
CREATE OR REPLACE FUNCTION public.can_approve_programme(_user_id uuid, _programme_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _creator_id uuid;
  _has_approve boolean;
  _is_delegated boolean;
BEGIN
  -- Get creator
  SELECT created_by INTO _creator_id
  FROM programmes WHERE id = _programme_id;

  -- Four-eyes: cannot approve own
  IF _creator_id = _user_id THEN
    RETURN false;
  END IF;

  -- Check direct permission flag
  _has_approve := has_permission(_user_id, 'programme', 'approve');

  -- Check delegated approval
  _is_delegated := is_delegated_approver(_user_id, _programme_id);

  RETURN (_has_approve OR _is_delegated);
END;
$$;


-- 6. Trigger function to enforce four-eyes on status transition
CREATE OR REPLACE FUNCTION public.enforce_programme_governance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE TRIGGER trg_enforce_programme_governance
  BEFORE UPDATE ON public.programmes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_programme_governance();
