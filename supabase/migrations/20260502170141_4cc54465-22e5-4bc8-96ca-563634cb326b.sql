-- Custom domain mappings per tenant
CREATE TABLE public.tenant_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  hostname TEXT NOT NULL,
  verification_token TEXT NOT NULL,
  verification_method TEXT NOT NULL DEFAULT 'TXT' CHECK (verification_method IN ('TXT','CNAME')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','failed')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  last_checked_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX tenant_domains_hostname_key ON public.tenant_domains (lower(hostname));
CREATE INDEX tenant_domains_tenant_idx ON public.tenant_domains (tenant_id);
CREATE UNIQUE INDEX tenant_domains_one_primary
  ON public.tenant_domains (tenant_id) WHERE is_primary = true;

ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins view domains" ON public.tenant_domains
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tenant_users tu
    WHERE tu.tenant_id = tenant_domains.tenant_id
      AND tu.user_id = auth.uid()
      AND tu.is_active = true
      AND tu.role IN ('owner','admin')
  )
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'systems_admin')
);

CREATE POLICY "Platform admins manage domains" ON public.tenant_domains
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'systems_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'systems_admin'));

CREATE TRIGGER trg_tenant_domains_updated
BEFORE UPDATE ON public.tenant_domains
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Renamed helper to avoid collision with existing is_tenant_admin signature
CREATE OR REPLACE FUNCTION public.is_tenant_owner_or_admin(_tenant_id UUID, _uid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE tenant_id = _tenant_id
      AND user_id = _uid
      AND is_active = true
      AND role IN ('owner','admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.add_tenant_domain(_tenant_id UUID, _hostname TEXT, _method TEXT DEFAULT 'TXT')
RETURNS public.tenant_domains
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _row public.tenant_domains; _token TEXT;
BEGIN
  IF NOT (public.is_tenant_owner_or_admin(_tenant_id, auth.uid())
       OR public.has_role(auth.uid(),'super_admin')
       OR public.has_role(auth.uid(),'systems_admin')) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  IF _hostname IS NULL OR length(trim(_hostname)) < 3 THEN
    RAISE EXCEPTION 'Invalid hostname';
  END IF;
  _token := 'lovable-verify=' || encode(gen_random_bytes(16),'hex');
  INSERT INTO public.tenant_domains (tenant_id, hostname, verification_token, verification_method, created_by)
  VALUES (_tenant_id, lower(trim(_hostname)), _token, COALESCE(_method,'TXT'), auth.uid())
  RETURNING * INTO _row;
  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_tenant_domain(_domain_id UUID, _verified BOOLEAN)
RETURNS public.tenant_domains
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _row public.tenant_domains;
BEGIN
  SELECT * INTO _row FROM public.tenant_domains WHERE id = _domain_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Domain not found'; END IF;
  IF NOT (public.is_tenant_owner_or_admin(_row.tenant_id, auth.uid())
       OR public.has_role(auth.uid(),'super_admin')
       OR public.has_role(auth.uid(),'systems_admin')) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  UPDATE public.tenant_domains
  SET status = CASE WHEN _verified THEN 'verified' ELSE 'failed' END,
      verified_at = CASE WHEN _verified THEN now() ELSE verified_at END,
      last_checked_at = now()
  WHERE id = _domain_id
  RETURNING * INTO _row;
  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_primary_tenant_domain(_domain_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _tenant UUID;
BEGIN
  SELECT tenant_id INTO _tenant FROM public.tenant_domains WHERE id = _domain_id AND status = 'verified';
  IF _tenant IS NULL THEN RAISE EXCEPTION 'Domain not verified'; END IF;
  IF NOT (public.is_tenant_owner_or_admin(_tenant, auth.uid())
       OR public.has_role(auth.uid(),'super_admin')
       OR public.has_role(auth.uid(),'systems_admin')) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  UPDATE public.tenant_domains SET is_primary = false WHERE tenant_id = _tenant;
  UPDATE public.tenant_domains SET is_primary = true WHERE id = _domain_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_tenant_domain(_domain_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _tenant UUID;
BEGIN
  SELECT tenant_id INTO _tenant FROM public.tenant_domains WHERE id = _domain_id;
  IF _tenant IS NULL THEN RETURN; END IF;
  IF NOT (public.is_tenant_owner_or_admin(_tenant, auth.uid())
       OR public.has_role(auth.uid(),'super_admin')
       OR public.has_role(auth.uid(),'systems_admin')) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  DELETE FROM public.tenant_domains WHERE id = _domain_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_tenant_by_hostname(_hostname TEXT)
RETURNS TABLE (
  id UUID, slug TEXT, name TEXT, logo_url TEXT, favicon_url TEXT, primary_color TEXT, secondary_color TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT t.id, t.slug, t.name, t.logo_url, t.favicon_url, t.primary_color, t.secondary_color
  FROM public.tenant_domains d
  JOIN public.tenants t ON t.id = d.tenant_id
  WHERE lower(d.hostname) = lower(_hostname)
    AND d.status = 'verified'
    AND t.status = 'active'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_tenant_by_hostname(TEXT) TO anon, authenticated;
