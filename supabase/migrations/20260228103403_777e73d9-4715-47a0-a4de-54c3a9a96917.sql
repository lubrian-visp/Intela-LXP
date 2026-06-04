
-- Create storage bucket for branding assets
INSERT INTO storage.buckets (id, name, public) VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated admins to upload
CREATE POLICY "Admins upload branding assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'branding'
  AND (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'systems_admin'::public.app_role)
  )
);

-- Allow authenticated admins to update
CREATE POLICY "Admins update branding assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'branding'
  AND (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'systems_admin'::public.app_role)
  )
);

-- Allow authenticated admins to delete
CREATE POLICY "Admins delete branding assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'branding'
  AND (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'systems_admin'::public.app_role)
  )
);

-- Public read access for logos
CREATE POLICY "Public read branding assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding');
