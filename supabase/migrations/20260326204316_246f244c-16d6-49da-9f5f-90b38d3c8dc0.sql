
-- Directory oversight settings: persist disable/enable state for roles
CREATE TABLE IF NOT EXISTS public.directory_oversight_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_role text NOT NULL,
  feature_key text NOT NULL,
  is_disabled boolean NOT NULL DEFAULT false,
  disabled_by uuid,
  disabled_at timestamptz,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(target_role, feature_key)
);

ALTER TABLE public.directory_oversight_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated can read (to check if features are disabled for their role)
CREATE POLICY "Authenticated users can read oversight settings"
  ON public.directory_oversight_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Super admins can manage all oversight settings
CREATE POLICY "Super admins can manage all oversight settings"
  ON public.directory_oversight_settings
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Operations can manage oversight for lower roles only
CREATE POLICY "Operations can manage scoped oversight settings"
  ON public.directory_oversight_settings
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'operations'::app_role)
    AND target_role IN ('programme_manager', 'facilitator', 'assessor', 'moderator', 'mentor', 'learner', 'sponsor', 'talent_manager')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'operations'::app_role)
    AND target_role IN ('programme_manager', 'facilitator', 'assessor', 'moderator', 'mentor', 'learner', 'sponsor', 'talent_manager')
  );

-- Enable realtime for live sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.directory_oversight_settings;
