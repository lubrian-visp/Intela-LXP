-- Fix 1: Drop overly permissive true-condition write policies on staff_role_assignments
DROP POLICY IF EXISTS "Staff managers can insert role assignments" ON public.staff_role_assignments;
DROP POLICY IF EXISTS "Staff managers can update role assignments" ON public.staff_role_assignments;
DROP POLICY IF EXISTS "Staff managers can delete role assignments" ON public.staff_role_assignments;

-- Fix 2: Drop overly permissive true-condition write policies on course_content_links
DROP POLICY IF EXISTS "Auth users can manage course content links" ON public.course_content_links;
DROP POLICY IF EXISTS "Auth users can update course content links" ON public.course_content_links;
DROP POLICY IF EXISTS "Auth users can delete course content links" ON public.course_content_links;

-- Fix 3: Drop overly permissive true-condition write policies on cohort_staff_assignments
DROP POLICY IF EXISTS "Authenticated users can insert cohort staff assignments" ON public.cohort_staff_assignments;
DROP POLICY IF EXISTS "Authenticated users can delete cohort staff assignments" ON public.cohort_staff_assignments;

-- Fix 4: Set search_path on calculate_compliance_score function
CREATE OR REPLACE FUNCTION public.calculate_compliance_score(_actual numeric, _target numeric, _max_points numeric)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT LEAST(
    ROUND((_actual / NULLIF(_target, 0)) * _max_points, 2),
    _max_points
  )
$function$;