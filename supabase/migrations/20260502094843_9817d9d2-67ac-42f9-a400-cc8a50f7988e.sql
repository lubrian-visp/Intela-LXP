-- Tenant-scoped storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('tenant-assets', 'tenant-assets', true, 5242880,
    ARRAY['image/png','image/jpeg','image/svg+xml','image/webp','image/x-icon','image/vnd.microsoft.icon']),
  ('tenant-branding', 'tenant-branding', false, 10485760, NULL)
ON CONFLICT (id) DO NOTHING;

-- Helper: extract tenant_id from storage path (first folder segment)
CREATE OR REPLACE FUNCTION public.storage_path_tenant_id(_name text)
RETURNS uuid
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $$
DECLARE
  _seg text;
  _tid uuid;
BEGIN
  _seg := split_part(_name, '/', 1);
  IF _seg = '' THEN RETURN NULL; END IF;
  BEGIN
    _tid := _seg::uuid;
    RETURN _tid;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$;

-- Public read for tenant-assets (logos)
DROP POLICY IF EXISTS "tenant_assets_public_read" ON storage.objects;
CREATE POLICY "tenant_assets_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tenant-assets');

-- Members upload to tenant-assets (folder = tenant_id)
DROP POLICY IF EXISTS "tenant_assets_member_write" ON storage.objects;
CREATE POLICY "tenant_assets_member_write"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tenant-assets'
  AND public.can_access_tenant(public.storage_path_tenant_id(name))
);

DROP POLICY IF EXISTS "tenant_assets_member_update" ON storage.objects;
CREATE POLICY "tenant_assets_member_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tenant-assets'
  AND public.can_access_tenant(public.storage_path_tenant_id(name))
);

DROP POLICY IF EXISTS "tenant_assets_member_delete" ON storage.objects;
CREATE POLICY "tenant_assets_member_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'tenant-assets'
  AND public.can_access_tenant(public.storage_path_tenant_id(name))
);

-- tenant-branding (private) — members only
DROP POLICY IF EXISTS "tenant_branding_member_all" ON storage.objects;
CREATE POLICY "tenant_branding_member_all"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'tenant-branding'
  AND public.can_access_tenant(public.storage_path_tenant_id(name))
)
WITH CHECK (
  bucket_id = 'tenant-branding'
  AND public.can_access_tenant(public.storage_path_tenant_id(name))
);

-- Public branding fetch for login/landing pages (by slug)
CREATE OR REPLACE FUNCTION public.get_tenant_branding(_slug text)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  logo_url text,
  favicon_url text,
  primary_color text,
  secondary_color text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, slug, logo_url, favicon_url, primary_color, secondary_color
  FROM public.tenants
  WHERE slug = _slug AND status = 'active'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_branding(text) TO anon, authenticated;