
-- Tenant-admin scoped branding update RPC
CREATE OR REPLACE FUNCTION public.update_tenant_branding(
  _tenant_id uuid,
  _name text DEFAULT NULL,
  _primary_color text DEFAULT NULL,
  _secondary_color text DEFAULT NULL,
  _logo_url text DEFAULT NULL,
  _favicon_url text DEFAULT NULL,
  _contact_email text DEFAULT NULL
)
RETURNS public.tenants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.tenants;
BEGIN
  IF NOT (public.is_tenant_admin(auth.uid(), _tenant_id) OR public.is_platform_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorised to manage this tenant';
  END IF;

  UPDATE public.tenants
  SET
    name            = COALESCE(_name, name),
    primary_color   = COALESCE(_primary_color, primary_color),
    secondary_color = COALESCE(_secondary_color, secondary_color),
    logo_url        = COALESCE(_logo_url, logo_url),
    favicon_url     = COALESCE(_favicon_url, favicon_url),
    contact_email   = COALESCE(_contact_email, contact_email),
    updated_at      = now()
  WHERE id = _tenant_id
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_tenant_branding(uuid, text, text, text, text, text, text) TO authenticated;

-- Helper: which tenants is the current user an admin/owner of?
CREATE OR REPLACE FUNCTION public.get_user_admin_tenant_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.tenant_users
  WHERE user_id = _user_id
    AND is_active = true
    AND role IN ('owner', 'admin');
$$;

GRANT EXECUTE ON FUNCTION public.get_user_admin_tenant_ids(uuid) TO authenticated;

-- Allow tenant admins to update role of a tenant member (but not platform-level fields)
CREATE OR REPLACE FUNCTION public.set_tenant_member_role(
  _tenant_id uuid,
  _user_id uuid,
  _role text,
  _is_active boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_tenant_admin(auth.uid(), _tenant_id) OR public.is_platform_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  IF _role NOT IN ('owner','admin','member','viewer') THEN
    RAISE EXCEPTION 'Invalid role: %', _role;
  END IF;

  -- Prevent removing the last owner
  IF _role <> 'owner' OR _is_active = false THEN
    IF (SELECT COUNT(*) FROM public.tenant_users
        WHERE tenant_id = _tenant_id AND role = 'owner' AND is_active = true
          AND user_id <> _user_id) = 0
       AND EXISTS (
         SELECT 1 FROM public.tenant_users
         WHERE tenant_id = _tenant_id AND user_id = _user_id
           AND role = 'owner' AND is_active = true
       )
    THEN
      RAISE EXCEPTION 'Cannot demote or deactivate the last owner of this tenant';
    END IF;
  END IF;

  UPDATE public.tenant_users
  SET role = _role,
      is_active = COALESCE(_is_active, is_active),
      updated_at = now()
  WHERE tenant_id = _tenant_id AND user_id = _user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_tenant_member_role(uuid, uuid, text, boolean) TO authenticated;
