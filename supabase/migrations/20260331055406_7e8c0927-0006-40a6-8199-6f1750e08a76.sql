-- Recreate profiles_safe view with both security_barrier AND security_invoker
-- security_invoker ensures underlying profiles table RLS is enforced
CREATE OR REPLACE VIEW public.profiles_safe
WITH (security_barrier = true, security_invoker = true) AS
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
    WHEN (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role)) THEN phone
    ELSE NULL::text
  END AS phone,
  CASE
    WHEN (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role)) THEN organisation
    ELSE NULL::text
  END AS organisation
FROM profiles
WHERE (auth.uid() IS NOT NULL) AND (
  (user_id = auth.uid())
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

GRANT SELECT ON public.profiles_safe TO authenticated;