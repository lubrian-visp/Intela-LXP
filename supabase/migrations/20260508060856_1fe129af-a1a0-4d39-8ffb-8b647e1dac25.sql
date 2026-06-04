ALTER TABLE public.drip_schedules
  ADD COLUMN IF NOT EXISTS assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_drip_schedules_assessment ON public.drip_schedules(assessment_id);

CREATE TABLE IF NOT EXISTS public.assessment_prerequisites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  prerequisite_module_id UUID REFERENCES public.programme_modules(id) ON DELETE CASCADE,
  prerequisite_assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
  prerequisite_type TEXT NOT NULL DEFAULT 'completion' CHECK (prerequisite_type IN ('completion', 'min_score')),
  min_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT assessment_prereq_target_chk CHECK (
    (prerequisite_module_id IS NOT NULL AND prerequisite_assessment_id IS NULL) OR
    (prerequisite_module_id IS NULL AND prerequisite_assessment_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_assessment_prereq_assessment ON public.assessment_prerequisites(assessment_id);

ALTER TABLE public.assessment_prerequisites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read assessment prerequisites"
  ON public.assessment_prerequisites FOR SELECT TO authenticated USING (true);

CREATE POLICY "Programme managers can insert assessment prerequisites"
  ON public.assessment_prerequisites FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
    OR has_role(auth.uid(), 'programme_manager'::app_role)
  );

CREATE POLICY "Programme managers can delete assessment prerequisites"
  ON public.assessment_prerequisites FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
    OR has_role(auth.uid(), 'programme_manager'::app_role)
  );