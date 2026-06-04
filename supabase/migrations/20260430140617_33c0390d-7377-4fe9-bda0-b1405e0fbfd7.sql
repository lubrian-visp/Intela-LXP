-- 1) Restrict programme_assessment_config SELECT to authenticated only
DROP POLICY IF EXISTS "Authenticated read programme assessment config" ON public.programme_assessment_config;

CREATE POLICY "Authenticated read programme assessment config"
ON public.programme_assessment_config
FOR SELECT
TO authenticated
USING (true);

-- 2) Add UPDATE policy on storage.objects for curriculum-uploads bucket,
-- mirroring the DELETE policy scope (staff roles only).
DROP POLICY IF EXISTS "Staff can update curriculum uploads" ON storage.objects;

CREATE POLICY "Staff can update curriculum uploads"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'curriculum-uploads'
  AND (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'systems_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'operations'::public.app_role)
    OR public.has_role(auth.uid(), 'programme_manager'::public.app_role)
  )
)
WITH CHECK (
  bucket_id = 'curriculum-uploads'
  AND (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'systems_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'operations'::public.app_role)
    OR public.has_role(auth.uid(), 'programme_manager'::public.app_role)
  )
);