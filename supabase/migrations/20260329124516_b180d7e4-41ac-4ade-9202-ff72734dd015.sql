
-- 1. Remove the broad "Staff can view all profiles" policy from the base table
-- Staff will access profiles through the profiles_safe view instead
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;

-- 2. Recreate profiles_safe as a security_barrier view (NOT security_invoker)
-- so it runs as the view owner and bypasses base table RLS,
-- while embedding access control directly in the WHERE clause
DROP VIEW IF EXISTS public.profiles_safe;

CREATE VIEW public.profiles_safe WITH (security_barrier = true) AS
SELECT
  id,
  user_id,
  full_name,
  avatar_url,
  email,
  job_title,
  department,
  location,
  status,
  verified_at,
  created_at,
  updated_at,
  CASE
    WHEN is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role) THEN phone
    ELSE NULL::text
  END AS phone,
  CASE
    WHEN is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role) THEN organisation
    ELSE NULL::text
  END AS organisation
FROM public.profiles
WHERE auth.uid() IS NOT NULL
  AND (
    user_id = auth.uid()
    OR is_platform_admin(auth.uid())
    OR has_role(auth.uid(), 'facilitator'::app_role)
    OR has_role(auth.uid(), 'assessor'::app_role)
    OR has_role(auth.uid(), 'moderator'::app_role)
    OR has_role(auth.uid(), 'mentor'::app_role)
    OR has_role(auth.uid(), 'programme_manager'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
    OR has_role(auth.uid(), 'talent_manager'::app_role)
    OR has_role(auth.uid(), 'systems_admin'::app_role)
  );

-- 3. Grant SELECT on the safe view to authenticated users
GRANT SELECT ON public.profiles_safe TO authenticated;
