
-- ===== ASSESSMENT ENHANCEMENT TABLES =====

-- 1. Assessment Settings (advanced config per assessment)
CREATE TABLE public.assessment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE UNIQUE,
  time_limit_minutes integer DEFAULT NULL,
  attempts_allowed integer DEFAULT 1,
  availability_start timestamptz DEFAULT NULL,
  availability_end timestamptz DEFAULT NULL,
  display_mode text NOT NULL DEFAULT 'all_at_once',
  allow_backtracking boolean NOT NULL DEFAULT true,
  show_question_flagging boolean NOT NULL DEFAULT true,
  feedback_release text NOT NULL DEFAULT 'after_submission',
  randomise_questions boolean NOT NULL DEFAULT false,
  randomise_options boolean NOT NULL DEFAULT false,
  show_correct_answers boolean NOT NULL DEFAULT true,
  require_lockdown_browser boolean NOT NULL DEFAULT false,
  access_code text DEFAULT NULL,
  ip_restrictions text[] DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Question Banks
CREATE TABLE public.question_banks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  programme_id uuid REFERENCES public.programmes(id) ON DELETE SET NULL,
  folder_path text DEFAULT '/',
  created_by uuid DEFAULT auth.uid(),
  is_shared boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Question Bank Items (questions in banks, reusable across assessments)
CREATE TABLE public.question_bank_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id uuid NOT NULL REFERENCES public.question_banks(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'multiple_choice',
  points integer NOT NULL DEFAULT 1,
  difficulty_level text DEFAULT 'medium',
  explanation text,
  options jsonb DEFAULT '[]'::jsonb,
  matching_pairs jsonb DEFAULT NULL,
  ordering_items jsonb DEFAULT NULL,
  fill_blanks jsonb DEFAULT NULL,
  likert_config jsonb DEFAULT NULL,
  tags text[] DEFAULT '{}',
  learning_outcome_ids uuid[] DEFAULT '{}',
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Rubrics
CREATE TABLE public.rubrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  rubric_type text NOT NULL DEFAULT 'analytic',
  programme_id uuid REFERENCES public.programmes(id) ON DELETE SET NULL,
  max_score numeric,
  is_reusable boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Rubric Criteria (rows/columns for analytic rubrics)
CREATE TABLE public.rubric_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric_id uuid NOT NULL REFERENCES public.rubrics(id) ON DELETE CASCADE,
  criterion_name text NOT NULL,
  description text,
  max_points numeric NOT NULL DEFAULT 10,
  sequence_order integer NOT NULL DEFAULT 0,
  performance_levels jsonb NOT NULL DEFAULT '[
    {"level": "Excellent", "points": 10, "description": ""},
    {"level": "Good", "points": 7, "description": ""},
    {"level": "Satisfactory", "points": 5, "description": ""},
    {"level": "Needs Improvement", "points": 2, "description": ""}
  ]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Assessment-Rubric link
CREATE TABLE public.assessment_rubrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  rubric_id uuid NOT NULL REFERENCES public.rubrics(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(assessment_id, rubric_id)
);

-- ===== RLS =====
ALTER TABLE public.assessment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubric_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_rubrics ENABLE ROW LEVEL SECURITY;

-- Assessment settings: readable by authenticated, manageable by staff
CREATE POLICY "Authenticated can read assessment_settings" ON public.assessment_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage assessment_settings" ON public.assessment_settings FOR ALL TO authenticated USING (
  public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'programme_manager'::app_role) OR public.has_role(auth.uid(), 'facilitator'::app_role)
);

-- Question banks: readable by authenticated, manageable by staff
CREATE POLICY "Authenticated can read question_banks" ON public.question_banks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage question_banks" ON public.question_banks FOR ALL TO authenticated USING (
  public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'programme_manager'::app_role) OR public.has_role(auth.uid(), 'facilitator'::app_role)
);

CREATE POLICY "Authenticated can read question_bank_items" ON public.question_bank_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage question_bank_items" ON public.question_bank_items FOR ALL TO authenticated USING (
  public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'programme_manager'::app_role) OR public.has_role(auth.uid(), 'facilitator'::app_role)
);

-- Rubrics: readable by authenticated, manageable by staff
CREATE POLICY "Authenticated can read rubrics" ON public.rubrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage rubrics" ON public.rubrics FOR ALL TO authenticated USING (
  public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'programme_manager'::app_role) OR public.has_role(auth.uid(), 'facilitator'::app_role) OR public.has_role(auth.uid(), 'assessor'::app_role)
);

CREATE POLICY "Authenticated can read rubric_criteria" ON public.rubric_criteria FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage rubric_criteria" ON public.rubric_criteria FOR ALL TO authenticated USING (
  public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'programme_manager'::app_role) OR public.has_role(auth.uid(), 'facilitator'::app_role) OR public.has_role(auth.uid(), 'assessor'::app_role)
);

CREATE POLICY "Authenticated can read assessment_rubrics" ON public.assessment_rubrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage assessment_rubrics" ON public.assessment_rubrics FOR ALL TO authenticated USING (
  public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'programme_manager'::app_role) OR public.has_role(auth.uid(), 'facilitator'::app_role)
);
