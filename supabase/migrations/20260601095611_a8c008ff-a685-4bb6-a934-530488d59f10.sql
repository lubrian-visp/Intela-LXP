-- C-1: Allow users to always read/write their own profile row even if their
-- tenant_users provisioning is incomplete. The existing RESTRICTIVE fence
-- `tenant_isolation_fence` blocks self-access whenever the profile's
-- tenant_id is not yet visible via can_access_tenant(), which surfaces as
-- a 403 from PostgREST during initial login.
DROP POLICY IF EXISTS "tenant_isolation_fence" ON public.profiles;

CREATE POLICY "tenant_isolation_fence"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (user_id = auth.uid() OR public.can_access_tenant(tenant_id))
WITH CHECK (user_id = auth.uid() OR public.can_access_tenant(tenant_id));