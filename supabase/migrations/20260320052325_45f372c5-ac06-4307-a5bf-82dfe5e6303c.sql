
-- ===== 1. QUIZ BUILDER =====
-- Quiz questions linked to assessments
CREATE TABLE public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'multiple_choice', -- multiple_choice, true_false, short_answer, matching
  points numeric NOT NULL DEFAULT 1,
  sequence_order integer NOT NULL DEFAULT 0,
  explanation text, -- shown after answering
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Quiz answer options
CREATE TABLE public.quiz_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  sequence_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Learner quiz responses
CREATE TABLE public.quiz_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.assessment_submissions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  selected_option_id uuid REFERENCES public.quiz_options(id),
  text_answer text,
  is_correct boolean,
  points_earned numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===== 2. COMPLETION PREREQUISITES =====
CREATE TABLE public.content_prerequisites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_block_id uuid NOT NULL REFERENCES public.content_blocks(id) ON DELETE CASCADE,
  prerequisite_block_id uuid NOT NULL REFERENCES public.content_blocks(id) ON DELETE CASCADE,
  prerequisite_type text NOT NULL DEFAULT 'completion', -- completion, score_threshold
  min_score numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(content_block_id, prerequisite_block_id)
);

-- Module-level prerequisites
CREATE TABLE public.module_prerequisites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.programme_modules(id) ON DELETE CASCADE,
  prerequisite_module_id uuid NOT NULL REFERENCES public.programme_modules(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(module_id, prerequisite_module_id)
);

-- ===== 3. CERTIFICATE TEMPLATES =====
CREATE TABLE public.certificate_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  programme_type_id uuid REFERENCES public.programme_types(id),
  programme_id uuid REFERENCES public.programmes(id),
  template_html text NOT NULL DEFAULT '<div>Certificate of Completion</div>',
  background_color text DEFAULT '#ffffff',
  accent_color text DEFAULT '#1a365d',
  logo_url text,
  signatory_name text,
  signatory_title text,
  is_default boolean DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ===== 4. GAMIFICATION =====
-- Badge definitions
CREATE TABLE public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT 'award', -- lucide icon name
  color text NOT NULL DEFAULT '#f59e0b',
  category text NOT NULL DEFAULT 'achievement', -- achievement, milestone, streak, special
  criteria_type text NOT NULL DEFAULT 'manual', -- manual, auto_completion, auto_score, auto_streak
  criteria_value jsonb, -- e.g. {"modules_completed": 5} or {"streak_days": 7}
  points_value integer NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Learner badges (earned)
CREATE TABLE public.learner_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  enrolment_id uuid REFERENCES public.enrolments(id),
  earned_at timestamptz NOT NULL DEFAULT now(),
  awarded_by uuid,
  UNIQUE(learner_id, badge_id)
);

-- Learner points ledger
CREATE TABLE public.learner_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL,
  enrolment_id uuid REFERENCES public.enrolments(id),
  points integer NOT NULL,
  reason text NOT NULL,
  reference_type text, -- content_block, assessment, badge, streak
  reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===== RLS =====
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_points ENABLE ROW LEVEL SECURITY;

-- Quiz questions/options: readable by authenticated users
CREATE POLICY "Authenticated can read quiz_questions" ON public.quiz_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read quiz_options" ON public.quiz_options FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage quiz_questions" ON public.quiz_questions FOR ALL TO authenticated USING (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'programme_manager'::app_role) OR public.has_role(auth.uid(), 'facilitator'::app_role));
CREATE POLICY "Staff can manage quiz_options" ON public.quiz_options FOR ALL TO authenticated USING (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'programme_manager'::app_role) OR public.has_role(auth.uid(), 'facilitator'::app_role));

-- Quiz responses: learners can insert own, staff can read all
CREATE POLICY "Learners can insert own quiz_responses" ON public.quiz_responses FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.assessment_submissions s WHERE s.id = submission_id AND s.learner_id = auth.uid())
);
CREATE POLICY "Learners can read own quiz_responses" ON public.quiz_responses FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.assessment_submissions s WHERE s.id = submission_id AND s.learner_id = auth.uid())
  OR public.is_platform_admin(auth.uid())
  OR public.has_role(auth.uid(), 'assessor'::app_role)
);

-- Prerequisites: readable by authenticated
CREATE POLICY "Authenticated can read content_prerequisites" ON public.content_prerequisites FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage content_prerequisites" ON public.content_prerequisites FOR ALL TO authenticated USING (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'programme_manager'::app_role));
CREATE POLICY "Authenticated can read module_prerequisites" ON public.module_prerequisites FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage module_prerequisites" ON public.module_prerequisites FOR ALL TO authenticated USING (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'programme_manager'::app_role));

-- Certificate templates: readable by authenticated
CREATE POLICY "Authenticated can read certificate_templates" ON public.certificate_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage certificate_templates" ON public.certificate_templates FOR ALL TO authenticated USING (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'programme_manager'::app_role));

-- Badges: readable by all authenticated
CREATE POLICY "Authenticated can read badges" ON public.badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage badges" ON public.badges FOR ALL TO authenticated USING (public.is_platform_admin(auth.uid()));

-- Learner badges: learners see own, staff see all
CREATE POLICY "Learners can read own badges" ON public.learner_badges FOR SELECT TO authenticated USING (learner_id = auth.uid() OR public.is_platform_admin(auth.uid()));
CREATE POLICY "System can insert learner_badges" ON public.learner_badges FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'facilitator'::app_role) OR public.has_role(auth.uid(), 'assessor'::app_role));

-- Learner points: learners see own
CREATE POLICY "Learners can read own points" ON public.learner_points FOR SELECT TO authenticated USING (learner_id = auth.uid() OR public.is_platform_admin(auth.uid()));
CREATE POLICY "System can insert learner_points" ON public.learner_points FOR INSERT TO authenticated WITH CHECK (true);
