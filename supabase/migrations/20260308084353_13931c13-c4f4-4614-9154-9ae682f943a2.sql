
-- Mentor check-in sessions
CREATE TABLE public.mentor_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID NOT NULL,
  mentee_id UUID NOT NULL,
  enrolment_id UUID REFERENCES public.enrolments(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL DEFAULT 'check_in',
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'scheduled',
  location TEXT,
  notes TEXT,
  action_items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mentee goals / action plans
CREATE TABLE public.mentor_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID NOT NULL,
  mentee_id UUID NOT NULL,
  enrolment_id UUID REFERENCES public.enrolments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'in_progress',
  progress_percentage INTEGER DEFAULT 0,
  mentor_notes TEXT,
  mentee_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mentor messages
CREATE TABLE public.mentor_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  enrolment_id UUID REFERENCES public.enrolments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workplace evidence for mentor validation
CREATE TABLE public.workplace_evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  learner_id UUID NOT NULL,
  enrolment_id UUID REFERENCES public.enrolments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  evidence_type TEXT NOT NULL DEFAULT 'document',
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ DEFAULT now(),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mentor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workplace_evidence ENABLE ROW LEVEL SECURITY;

-- RLS policies for mentor_sessions
CREATE POLICY "Mentors can manage their sessions" ON public.mentor_sessions
  FOR ALL TO authenticated
  USING (mentor_id = auth.uid() OR mentee_id = auth.uid());

-- RLS policies for mentor_goals
CREATE POLICY "Mentors and mentees can access goals" ON public.mentor_goals
  FOR ALL TO authenticated
  USING (mentor_id = auth.uid() OR mentee_id = auth.uid());

-- RLS policies for mentor_messages
CREATE POLICY "Users can access their messages" ON public.mentor_messages
  FOR ALL TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- RLS policies for workplace_evidence
CREATE POLICY "Learners and reviewers can access evidence" ON public.workplace_evidence
  FOR ALL TO authenticated
  USING (learner_id = auth.uid() OR reviewed_by = auth.uid());

-- Platform admins can see all
CREATE POLICY "Admins see all mentor sessions" ON public.mentor_sessions
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Admins see all mentor goals" ON public.mentor_goals
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Admins see all messages" ON public.mentor_messages
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Admins see all evidence" ON public.workplace_evidence
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.mentor_messages;
