
-- Assessor Report Templates: global defaults + per-programme overrides
CREATE TABLE public.assessor_report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Default Assessor Report Template',
  scope_level text NOT NULL DEFAULT 'global' CHECK (scope_level IN ('global', 'programme')),
  programme_id uuid REFERENCES public.programmes(id) ON DELETE CASCADE,
  section2_criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  section3_criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope_level, programme_id)
);

-- Version history for audit trail
CREATE TABLE public.assessor_report_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.assessor_report_templates(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  section2_criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  section3_criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  changed_by uuid,
  change_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assessor_report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessor_report_template_versions ENABLE ROW LEVEL SECURITY;

-- RLS: platform admins can manage, all authenticated can read
CREATE POLICY "Admins can manage templates"
  ON public.assessor_report_templates FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Authenticated can read active templates"
  ON public.assessor_report_templates FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage template versions"
  ON public.assessor_report_template_versions FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Authenticated can read template versions"
  ON public.assessor_report_template_versions FOR SELECT TO authenticated
  USING (true);

-- Auto-version trigger: snapshot before update
CREATE OR REPLACE FUNCTION public.snapshot_template_version()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _next_version integer;
BEGIN
  IF OLD.section2_criteria IS DISTINCT FROM NEW.section2_criteria
     OR OLD.section3_criteria IS DISTINCT FROM NEW.section3_criteria THEN
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO _next_version
    FROM assessor_report_template_versions WHERE template_id = OLD.id;

    INSERT INTO assessor_report_template_versions (template_id, version_number, section2_criteria, section3_criteria, changed_by)
    VALUES (OLD.id, _next_version, OLD.section2_criteria, OLD.section3_criteria, auth.uid());
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_snapshot_template_version
  BEFORE UPDATE ON public.assessor_report_templates
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_template_version();
