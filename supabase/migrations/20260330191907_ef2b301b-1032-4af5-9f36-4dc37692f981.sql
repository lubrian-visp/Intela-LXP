
-- Restore member SELECT on base table for join compatibility,
-- but ALSO keep the safe view for explicit non-sensitive queries.
-- Members need basic tenant data for branding/routing.
-- Sensitive columns (contact_email, contact_phone, address, subscription_tier)
-- are protected by revoking column-level SELECT for authenticated role.

-- Drop the admin-only policy we just created
DROP POLICY IF EXISTS "Tenant admins can view their tenant" ON public.tenants;

-- Restore the original member policy
CREATE POLICY "Tenant members can view their tenant"
  ON public.tenants
  FOR SELECT
  TO authenticated
  USING (id IN (SELECT get_user_tenant_ids(auth.uid())));

-- Revoke SELECT on sensitive columns from authenticated role
REVOKE SELECT (contact_email, contact_phone, address, subscription_tier, max_users, max_programmes) ON public.tenants FROM authenticated;

-- Platform admins retain full access via the ALL policy
