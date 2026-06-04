CREATE OR REPLACE VIEW public.profiles_safe
WITH (security_barrier = true) AS
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
  NULL::text AS phone,
  NULL::text AS organisation
FROM public.profiles
WHERE auth.uid() IS NOT NULL
  AND (
    user_id = auth.uid()
    OR public.is_platform_admin(auth.uid())
    OR public.has_role(auth.uid(), 'systems_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'operations'::public.app_role)
    OR public.has_role(auth.uid(), 'programme_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'talent_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'facilitator'::public.app_role)
    OR public.has_role(auth.uid(), 'assessor'::public.app_role)
    OR public.has_role(auth.uid(), 'moderator'::public.app_role)
    OR public.has_role(auth.uid(), 'mentor'::public.app_role)
  );

GRANT SELECT ON public.profiles_safe TO authenticated;
REVOKE SELECT ON public.profiles_safe FROM anon;