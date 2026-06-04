
-- Feature flags table for toggling AI curriculum import
CREATE TABLE public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text NOT NULL UNIQUE,
  is_enabled boolean NOT NULL DEFAULT true,
  description text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read flags
CREATE POLICY "Authenticated read feature flags"
  ON public.feature_flags FOR SELECT
  USING (true);

-- Only super_admin and operations can manage flags
CREATE POLICY "Admins manage feature flags"
  ON public.feature_flags FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the AI curriculum import flag (enabled by default)
INSERT INTO public.feature_flags (flag_key, is_enabled, description)
VALUES ('ai_curriculum_import', true, 'Enable AI-powered curriculum import in the Programme Builder');

-- Storage bucket for curriculum uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('curriculum-uploads', 'curriculum-uploads', false);

-- Only authenticated users can upload to the bucket
CREATE POLICY "Authenticated users upload curriculum"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'curriculum-uploads' AND auth.uid() IS NOT NULL);

-- Users can read their own uploads
CREATE POLICY "Users read own curriculum uploads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'curriculum-uploads' AND auth.uid() IS NOT NULL);

-- Users can delete their own uploads
CREATE POLICY "Users delete own curriculum uploads"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'curriculum-uploads' AND auth.uid() IS NOT NULL);
