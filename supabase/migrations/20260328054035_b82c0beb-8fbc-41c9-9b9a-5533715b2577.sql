
-- Programme Edit Permissions table
CREATE TABLE public.programme_edit_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id uuid REFERENCES public.programmes(id) ON DELETE CASCADE,
  grantee_id uuid NOT NULL,
  granted_by uuid NOT NULL,
  permission_type text NOT NULL DEFAULT 'content_edit',
  scope text NOT NULL DEFAULT 'programme',
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  reason text,
  revoked_at timestamptz,
  revoked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_programme_edit_perms_grantee ON public.programme_edit_permissions(grantee_id, is_active);
CREATE INDEX idx_programme_edit_perms_programme ON public.programme_edit_permissions(programme_id, is_active);

-- Updated_at trigger
CREATE TRIGGER update_programme_edit_permissions_updated_at
  BEFORE UPDATE ON public.programme_edit_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.programme_edit_permissions ENABLE ROW LEVEL SECURITY;

-- RLS: platform admins and ops can manage
CREATE POLICY "Platform admins can manage edit permissions"
  ON public.programme_edit_permissions
  FOR ALL
  TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR public.has_role(auth.uid(), 'operations'::app_role)
  )
  WITH CHECK (
    public.is_platform_admin(auth.uid())
    OR public.has_role(auth.uid(), 'operations'::app_role)
  );

-- RLS: grantees can view their own permissions
CREATE POLICY "Users can view own edit permissions"
  ON public.programme_edit_permissions
  FOR SELECT
  TO authenticated
  USING (grantee_id = auth.uid());

-- Security definer function to check edit authority
CREATE OR REPLACE FUNCTION public.can_edit_programme_content(_user_id uuid, _programme_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Super Admin, Systems Admin: always allowed
  IF has_role(_user_id, 'super_admin'::app_role) OR has_role(_user_id, 'systems_admin'::app_role) THEN
    RETURN true;
  END IF;

  -- Operations Control: always allowed
  IF has_role(_user_id, 'operations'::app_role) THEN
    RETURN true;
  END IF;

  -- Programme Manager and others: check for active grant
  IF EXISTS (
    SELECT 1 FROM programme_edit_permissions
    WHERE grantee_id = _user_id
      AND is_active = true
      AND (programme_id = _programme_id OR programme_id IS NULL)
      AND (expires_at IS NULL OR expires_at > now())
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Audit trigger for grant/revoke actions
CREATE OR REPLACE FUNCTION public.audit_edit_permission_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.onboarding_audit_log (entity_type, entity_id, action, performed_by, details)
    VALUES (
      'programme_edit_permission', NEW.id,
      'edit_permission_granted',
      NEW.granted_by,
      jsonb_build_object(
        'programme_id', NEW.programme_id,
        'grantee_id', NEW.grantee_id,
        'permission_type', NEW.permission_type,
        'scope', NEW.scope,
        'reason', NEW.reason,
        'expires_at', NEW.expires_at
      )
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.is_active = true AND NEW.is_active = false THEN
    INSERT INTO public.onboarding_audit_log (entity_type, entity_id, action, performed_by, details)
    VALUES (
      'programme_edit_permission', NEW.id,
      'edit_permission_revoked',
      COALESCE(NEW.revoked_by, auth.uid()),
      jsonb_build_object(
        'programme_id', NEW.programme_id,
        'grantee_id', NEW.grantee_id,
        'reason', NEW.reason
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_edit_permission
  AFTER INSERT OR UPDATE ON public.programme_edit_permissions
  FOR EACH ROW EXECUTE FUNCTION public.audit_edit_permission_change();
