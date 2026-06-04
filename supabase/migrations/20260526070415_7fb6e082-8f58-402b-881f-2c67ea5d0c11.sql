
-- ============================================================
-- SCORM Runtime Schema (IEEE 1484.11.2 compliant persistence)
-- ============================================================

-- 1. Packages
CREATE TABLE IF NOT EXISTS public.scorm_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_block_id uuid REFERENCES public.content_blocks(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  scorm_version text NOT NULL DEFAULT 'scorm_2004', -- scorm_12 | scorm_2004 | xapi | cmi5
  storage_path text NOT NULL,  -- folder in scorm-packages bucket
  launch_path text NOT NULL DEFAULT 'index.html',
  manifest jsonb,              -- parsed imsmanifest.xml (organizations, resources, items)
  file_size_bytes bigint,
  status text NOT NULL DEFAULT 'ready', -- uploading | unpacking | ready | failed
  error_message text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scorm_packages_block ON public.scorm_packages(content_block_id);
CREATE INDEX IF NOT EXISTS idx_scorm_packages_tenant ON public.scorm_packages(tenant_id);

-- 2. Sessions (attempts)
CREATE TABLE IF NOT EXISTS public.scorm_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.scorm_packages(id) ON DELETE CASCADE,
  learner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sco_id text NOT NULL DEFAULT 'default',
  attempt_number integer NOT NULL DEFAULT 1,
  completion_status text DEFAULT 'not attempted', -- not attempted | incomplete | completed | passed | failed | browsed
  success_status text,                            -- unknown | passed | failed
  score_raw numeric,
  score_min numeric,
  score_max numeric,
  score_scaled numeric,
  total_time_seconds integer DEFAULT 0,
  session_time_seconds integer DEFAULT 0,
  suspend_data text,
  location text,
  exit_mode text,
  entry_mode text DEFAULT 'ab-initio',
  started_at timestamptz NOT NULL DEFAULT now(),
  last_accessed_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  UNIQUE (package_id, learner_id, sco_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS idx_scorm_sessions_learner ON public.scorm_sessions(learner_id);
CREATE INDEX IF NOT EXISTS idx_scorm_sessions_package ON public.scorm_sessions(package_id);

-- 3. CMI element store (raw key/value, supports interactions, objectives, etc.)
CREATE TABLE IF NOT EXISTS public.scorm_cmi_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.scorm_sessions(id) ON DELETE CASCADE,
  element text NOT NULL,           -- e.g. cmi.core.lesson_status, cmi.interactions.0.id
  value text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, element)
);

CREATE INDEX IF NOT EXISTS idx_scorm_cmi_session ON public.scorm_cmi_data(session_id);

-- 4. Update triggers
CREATE TRIGGER trg_scorm_packages_updated
  BEFORE UPDATE ON public.scorm_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Enable RLS
ALTER TABLE public.scorm_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scorm_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scorm_cmi_data ENABLE ROW LEVEL SECURITY;

-- 6. Policies — scorm_packages
CREATE POLICY "scorm_packages: read by authenticated"
  ON public.scorm_packages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "scorm_packages: admins insert"
  ON public.scorm_packages FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_platform_admin(auth.uid())
    OR public.has_role(auth.uid(), 'operations'::app_role)
    OR public.has_role(auth.uid(), 'programme_manager'::app_role)
  );

CREATE POLICY "scorm_packages: admins update"
  ON public.scorm_packages FOR UPDATE
  TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR public.has_role(auth.uid(), 'operations'::app_role)
    OR public.has_role(auth.uid(), 'programme_manager'::app_role)
  );

CREATE POLICY "scorm_packages: admins delete"
  ON public.scorm_packages FOR DELETE
  TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR public.has_role(auth.uid(), 'operations'::app_role)
  );

-- 7. Policies — scorm_sessions (learner owns their attempt)
CREATE POLICY "scorm_sessions: learner read own"
  ON public.scorm_sessions FOR SELECT
  TO authenticated
  USING (learner_id = auth.uid() OR public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'operations'::app_role) OR public.has_role(auth.uid(), 'facilitator'::app_role));

CREATE POLICY "scorm_sessions: learner insert own"
  ON public.scorm_sessions FOR INSERT
  TO authenticated
  WITH CHECK (learner_id = auth.uid());

CREATE POLICY "scorm_sessions: learner update own"
  ON public.scorm_sessions FOR UPDATE
  TO authenticated
  USING (learner_id = auth.uid());

-- 8. Policies — scorm_cmi_data (through session ownership)
CREATE POLICY "scorm_cmi: learner read own"
  ON public.scorm_cmi_data FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.scorm_sessions s
      WHERE s.id = session_id
        AND (s.learner_id = auth.uid()
             OR public.is_platform_admin(auth.uid())
             OR public.has_role(auth.uid(), 'operations'::app_role)
             OR public.has_role(auth.uid(), 'facilitator'::app_role))
    )
  );

CREATE POLICY "scorm_cmi: learner write own"
  ON public.scorm_cmi_data FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.scorm_sessions s WHERE s.id = session_id AND s.learner_id = auth.uid())
  );

CREATE POLICY "scorm_cmi: learner update own"
  ON public.scorm_cmi_data FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.scorm_sessions s WHERE s.id = session_id AND s.learner_id = auth.uid())
  );

-- 9. Storage bucket for unpacked SCOs (private, signed URLs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('scorm-packages', 'scorm-packages', false)
ON CONFLICT (id) DO NOTHING;

-- 10. Storage policies
CREATE POLICY "scorm-packages: authenticated read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'scorm-packages');

CREATE POLICY "scorm-packages: admins write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'scorm-packages'
    AND (
      public.is_platform_admin(auth.uid())
      OR public.has_role(auth.uid(), 'operations'::app_role)
      OR public.has_role(auth.uid(), 'programme_manager'::app_role)
    )
  );

CREATE POLICY "scorm-packages: admins update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'scorm-packages'
    AND (
      public.is_platform_admin(auth.uid())
      OR public.has_role(auth.uid(), 'operations'::app_role)
    )
  );

CREATE POLICY "scorm-packages: admins delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'scorm-packages'
    AND (
      public.is_platform_admin(auth.uid())
      OR public.has_role(auth.uid(), 'operations'::app_role)
    )
  );
