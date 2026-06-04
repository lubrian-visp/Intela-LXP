
-- Learner content block progress tracking
CREATE TABLE public.learner_content_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  learner_id UUID NOT NULL,
  content_block_id UUID NOT NULL REFERENCES public.content_blocks(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.programme_modules(id) ON DELETE CASCADE,
  enrolment_id UUID NOT NULL REFERENCES public.enrolments(id) ON DELETE CASCADE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  time_spent_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(learner_id, content_block_id, enrolment_id)
);

ALTER TABLE public.learner_content_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners manage own progress" ON public.learner_content_progress
  FOR ALL TO authenticated
  USING (learner_id = auth.uid())
  WITH CHECK (learner_id = auth.uid());

CREATE POLICY "Staff read all progress" ON public.learner_content_progress
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'programme_manager'::app_role) OR
    has_role(auth.uid(), 'facilitator'::app_role)
  );

-- Learner notes per content block
CREATE TABLE public.learner_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  learner_id UUID NOT NULL,
  content_block_id UUID REFERENCES public.content_blocks(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.programme_modules(id) ON DELETE CASCADE,
  enrolment_id UUID NOT NULL REFERENCES public.enrolments(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.learner_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners manage own notes" ON public.learner_notes
  FOR ALL TO authenticated
  USING (learner_id = auth.uid())
  WITH CHECK (learner_id = auth.uid());

-- Learner bookmarks
CREATE TABLE public.learner_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  learner_id UUID NOT NULL,
  content_block_id UUID NOT NULL REFERENCES public.content_blocks(id) ON DELETE CASCADE,
  enrolment_id UUID NOT NULL REFERENCES public.enrolments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(learner_id, content_block_id, enrolment_id)
);

ALTER TABLE public.learner_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners manage own bookmarks" ON public.learner_bookmarks
  FOR ALL TO authenticated
  USING (learner_id = auth.uid())
  WITH CHECK (learner_id = auth.uid());
