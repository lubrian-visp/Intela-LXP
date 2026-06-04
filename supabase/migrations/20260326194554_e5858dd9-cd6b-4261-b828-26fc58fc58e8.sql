
-- =============================================
-- 1. SHARED CONTENT LIBRARY
-- =============================================

-- Shared content items (reusable lessons, quizzes, content blocks)
CREATE TABLE public.shared_content_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL DEFAULT 'lesson' CHECK (content_type IN ('lesson', 'quiz', 'content_block', 'topic', 'resource')),
  content JSONB DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  tags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Version history for shared content
CREATE TABLE public.shared_content_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.shared_content_items(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content JSONB DEFAULT '{}',
  change_reason TEXT,
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(item_id, version_number)
);

-- Links between shared content and courses/modules/lessons
CREATE TABLE public.course_content_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shared_item_id UUID NOT NULL REFERENCES public.shared_content_items(id) ON DELETE CASCADE,
  programme_id UUID REFERENCES public.programmes(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.programme_modules(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  custom_settings JSONB DEFAULT '{}',
  pinned_version INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 2. PAYMENT-GATED ENROLMENT
-- =============================================

-- Enrolment mode configuration per programme
CREATE TABLE public.programme_enrolment_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE UNIQUE,
  enrolment_mode TEXT NOT NULL DEFAULT 'free' CHECK (enrolment_mode IN ('open', 'free', 'buy_now', 'recurring', 'closed', 'prerequisite', 'approval', 'invitation')),
  price NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'ZAR',
  recurring_interval TEXT CHECK (recurring_interval IN ('monthly', 'quarterly', 'yearly', NULL)),
  free_trial_days INTEGER DEFAULT 0,
  capacity_limit INTEGER,
  waitlist_enabled BOOLEAN DEFAULT false,
  enrolment_start DATE,
  enrolment_end DATE,
  duration_days INTEGER,
  duration_type TEXT DEFAULT 'lifetime' CHECK (duration_type IN ('lifetime', 'fixed_days', 'fixed_date')),
  duration_end_date DATE,
  allow_re_enrolment BOOLEAN DEFAULT false,
  coupon_codes JSONB DEFAULT '[]',
  gateway_key TEXT,
  prerequisite_programme_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 3. CHALLENGE EXAMS
-- =============================================

CREATE TABLE public.challenge_exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Challenge Exam',
  description TEXT,
  passing_grade NUMERIC(5,2) NOT NULL DEFAULT 70,
  time_limit_minutes INTEGER DEFAULT 60,
  max_attempts INTEGER DEFAULT 1,
  question_count INTEGER DEFAULT 20,
  question_pool_assessment_ids UUID[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  on_pass_action TEXT DEFAULT 'auto_complete' CHECK (on_pass_action IN ('auto_complete', 'skip_to_module', 'grant_credit')),
  on_fail_action TEXT DEFAULT 'redirect_course' CHECK (on_fail_action IN ('redirect_course', 'block_retry', 'suggest_modules')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.challenge_exam_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.challenge_exams(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL REFERENCES auth.users(id),
  score NUMERIC(5,2),
  passed BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  answers JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 4. DRIP CONTENT & COMPLETION PAGES
-- =============================================

-- Drip schedule for content blocks / lessons
CREATE TABLE public.drip_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.programme_modules(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  content_block_id UUID REFERENCES public.content_blocks(id) ON DELETE CASCADE,
  drip_type TEXT NOT NULL DEFAULT 'days_after_enrolment' CHECK (drip_type IN ('days_after_enrolment', 'fixed_date', 'after_prerequisite', 'weekly', 'daily')),
  drip_value INTEGER DEFAULT 0,
  drip_date DATE,
  is_sample BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Completion page configuration per programme
CREATE TABLE public.programme_completion_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE UNIQUE,
  completion_message TEXT DEFAULT 'Congratulations! You have completed this programme.',
  show_certificate BOOLEAN DEFAULT true,
  show_social_share BOOLEAN DEFAULT true,
  show_next_recommendations BOOLEAN DEFAULT true,
  recommended_programme_ids UUID[] DEFAULT '{}',
  custom_html TEXT,
  redirect_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.shared_content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_content_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programme_enrolment_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drip_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programme_completion_config ENABLE ROW LEVEL SECURITY;

-- Shared content: authenticated users can read published, creators/admins can manage
CREATE POLICY "Authenticated users can read published shared content"
  ON public.shared_content_items FOR SELECT TO authenticated
  USING (status = 'published' OR created_by = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Creators and admins can insert shared content"
  ON public.shared_content_items FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Creators and admins can update shared content"
  ON public.shared_content_items FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Admins can delete shared content"
  ON public.shared_content_items FOR DELETE TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- Shared content versions: same as parent
CREATE POLICY "Auth users can read shared content versions"
  ON public.shared_content_versions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Auth users can insert shared content versions"
  ON public.shared_content_versions FOR INSERT TO authenticated WITH CHECK (true);

-- Course content links
CREATE POLICY "Auth users can read course content links"
  ON public.course_content_links FOR SELECT TO authenticated USING (true);

CREATE POLICY "Auth users can manage course content links"
  ON public.course_content_links FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Auth users can update course content links"
  ON public.course_content_links FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Auth users can delete course content links"
  ON public.course_content_links FOR DELETE TO authenticated USING (true);

-- Enrolment config: readable by all, manageable by admins/PM
CREATE POLICY "Auth users can read enrolment config"
  ON public.programme_enrolment_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage enrolment config"
  ON public.programme_enrolment_config FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'programme_manager'::app_role) OR public.has_role(auth.uid(), 'operations'::app_role));

CREATE POLICY "Admins can update enrolment config"
  ON public.programme_enrolment_config FOR UPDATE TO authenticated USING (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'programme_manager'::app_role) OR public.has_role(auth.uid(), 'operations'::app_role));

-- Challenge exams
CREATE POLICY "Auth users can read challenge exams"
  ON public.challenge_exams FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage challenge exams"
  ON public.challenge_exams FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'programme_manager'::app_role));

CREATE POLICY "Admins can update challenge exams"
  ON public.challenge_exams FOR UPDATE TO authenticated USING (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'programme_manager'::app_role));

CREATE POLICY "Admins can delete challenge exams"
  ON public.challenge_exams FOR DELETE TO authenticated USING (public.is_platform_admin(auth.uid()));

-- Challenge exam attempts
CREATE POLICY "Learners can read own attempts"
  ON public.challenge_exam_attempts FOR SELECT TO authenticated
  USING (learner_id = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Learners can insert own attempts"
  ON public.challenge_exam_attempts FOR INSERT TO authenticated
  WITH CHECK (learner_id = auth.uid());

CREATE POLICY "Learners can update own attempts"
  ON public.challenge_exam_attempts FOR UPDATE TO authenticated
  USING (learner_id = auth.uid());

-- Drip schedules
CREATE POLICY "Auth users can read drip schedules"
  ON public.drip_schedules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage drip schedules"
  ON public.drip_schedules FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'programme_manager'::app_role));

CREATE POLICY "Admins can update drip schedules"
  ON public.drip_schedules FOR UPDATE TO authenticated USING (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'programme_manager'::app_role));

CREATE POLICY "Admins can delete drip schedules"
  ON public.drip_schedules FOR DELETE TO authenticated USING (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'programme_manager'::app_role));

-- Completion config
CREATE POLICY "Auth users can read completion config"
  ON public.programme_completion_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage completion config"
  ON public.programme_completion_config FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'programme_manager'::app_role));

CREATE POLICY "Admins can update completion config"
  ON public.programme_completion_config FOR UPDATE TO authenticated USING (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'programme_manager'::app_role));
