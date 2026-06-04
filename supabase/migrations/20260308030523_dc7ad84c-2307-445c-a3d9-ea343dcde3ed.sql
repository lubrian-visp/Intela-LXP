
-- ============================================================
-- Phase 1: Flexible Assessment Module — DB Schema
-- ============================================================

-- 1. Lessons table (between modules and content_blocks)
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.programme_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  learning_objective TEXT,
  sequence_order INTEGER NOT NULL DEFAULT 1,
  duration_minutes INTEGER,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lessons_module_id ON public.lessons(module_id);

-- 2. Add lesson_id to content_blocks (nullable, for gradual migration)
ALTER TABLE public.content_blocks
  ADD COLUMN lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL;

CREATE INDEX idx_content_blocks_lesson_id ON public.content_blocks(lesson_id);

-- 3. Add assessment_category to assessments
ALTER TABLE public.assessments
  ADD COLUMN assessment_category TEXT NOT NULL DEFAULT 'formative';

COMMENT ON COLUMN public.assessments.assessment_category IS 'One of: diagnostic, formative, summative, transfer';

-- 4. Assessment links junction table (many-to-many linking)
CREATE TABLE public.assessment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  pathway_id UUID REFERENCES public.pathways(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.programme_modules(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL DEFAULT 'module_only',
  is_inherited BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, pathway_id, module_id, lesson_id)
);

CREATE INDEX idx_assessment_links_assessment ON public.assessment_links(assessment_id);
CREATE INDEX idx_assessment_links_pathway ON public.assessment_links(pathway_id);
CREATE INDEX idx_assessment_links_module ON public.assessment_links(module_id);
CREATE INDEX idx_assessment_links_lesson ON public.assessment_links(lesson_id);

COMMENT ON COLUMN public.assessment_links.link_type IS 'One of: track_only, module_only, lesson_only, track_module, track_lesson, module_lesson, track_module_lesson, combination';

-- 5. Updated_at trigger for lessons
CREATE TRIGGER trg_lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Updated_at trigger for assessment_links
CREATE TRIGGER trg_assessment_links_updated_at
  BEFORE UPDATE ON public.assessment_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 7. RLS policies
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_links ENABLE ROW LEVEL SECURITY;

-- Lessons: authenticated users can read
CREATE POLICY "Authenticated users can read lessons"
  ON public.lessons FOR SELECT TO authenticated
  USING (true);

-- Lessons: users with programme.create permission can manage
CREATE POLICY "Authorized users can insert lessons"
  ON public.lessons FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(auth.uid(), 'programme', 'create')
    OR public.is_platform_admin(auth.uid())
  );

CREATE POLICY "Authorized users can update lessons"
  ON public.lessons FOR UPDATE TO authenticated
  USING (
    public.has_permission(auth.uid(), 'programme', 'create')
    OR public.is_platform_admin(auth.uid())
  );

CREATE POLICY "Authorized users can delete lessons"
  ON public.lessons FOR DELETE TO authenticated
  USING (
    public.has_permission(auth.uid(), 'programme', 'create')
    OR public.is_platform_admin(auth.uid())
  );

-- Assessment links: authenticated users can read
CREATE POLICY "Authenticated users can read assessment_links"
  ON public.assessment_links FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authorized users can insert assessment_links"
  ON public.assessment_links FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(auth.uid(), 'programme', 'create')
    OR public.is_platform_admin(auth.uid())
  );

CREATE POLICY "Authorized users can update assessment_links"
  ON public.assessment_links FOR UPDATE TO authenticated
  USING (
    public.has_permission(auth.uid(), 'programme', 'create')
    OR public.is_platform_admin(auth.uid())
  );

CREATE POLICY "Authorized users can delete assessment_links"
  ON public.assessment_links FOR DELETE TO authenticated
  USING (
    public.has_permission(auth.uid(), 'programme', 'create')
    OR public.is_platform_admin(auth.uid())
  );

-- 8. Migrate existing assessment module_id links to assessment_links table
INSERT INTO public.assessment_links (assessment_id, module_id, link_type)
SELECT id, module_id, 'module_only'
FROM public.assessments
WHERE module_id IS NOT NULL
ON CONFLICT DO NOTHING;
