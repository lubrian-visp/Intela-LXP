-- Create a safe profiles view that excludes sensitive PII for non-admin staff
CREATE OR REPLACE VIEW public.profiles_safe AS
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
    WHEN is_platform_admin(auth.uid())
         OR has_role(auth.uid(), 'operations'::app_role)
    THEN phone
    ELSE NULL
  END AS phone,
  CASE
    WHEN is_platform_admin(auth.uid())
         OR has_role(auth.uid(), 'operations'::app_role)
    THEN organisation
    ELSE NULL
  END AS organisation
FROM public.profiles;

-- Make this view security invoker so RLS on the base table is enforced
ALTER VIEW public.profiles_safe SET (security_invoker = true);