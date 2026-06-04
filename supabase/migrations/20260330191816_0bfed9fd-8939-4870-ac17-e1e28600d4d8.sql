
-- Step 1: Create a safe view excluding sensitive tenant fields
CREATE OR REPLACE VIEW public.tenants_safe
WITH (security_barrier = true, security_invoker = true) AS
SELECT
  id,
  name,
  slug,
  domain,
  logo_url,
  favicon_url,
  primary_color,
  secondary_color,
  status,
  settings,
  country,
  created_at,
  updated_at
FROM public.tenants;

-- Step 2: Remove the existing member SELECT policy on the base table
DROP POLICY IF EXISTS "Tenant members can view their tenant" ON public.tenants;

-- Step 3: Re-create member SELECT policy scoped to admins/owners only on the base table
CREATE POLICY "Tenant admins can view their tenant"
  ON public.tenants
  FOR SELECT
  TO authenticated
  USING (
    is_platform_admin(auth.uid())
    OR is_tenant_admin(auth.uid(), id)
  );

-- Step 4: Grant SELECT on the safe view to authenticated users
GRANT SELECT ON public.tenants_safe TO authenticated;
