
-- Peer review assignments table
CREATE TABLE public.peer_review_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES public.assessments(id) ON DELETE CASCADE NOT NULL,
  reviewer_id uuid NOT NULL,
  reviewee_id uuid NOT NULL,
  submission_id uuid REFERENCES public.assessment_submissions(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  due_date timestamptz,
  assigned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT peer_review_no_self CHECK (reviewer_id <> reviewee_id)
);

-- Peer review feedback table
CREATE TABLE public.peer_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid REFERENCES public.peer_review_assignments(id) ON DELETE CASCADE NOT NULL,
  reviewer_id uuid NOT NULL,
  score numeric,
  feedback text,
  rubric_scores jsonb DEFAULT '[]'::jsonb,
  is_anonymous boolean DEFAULT true,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Proctoring violation log
CREATE TABLE public.proctoring_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES public.assessment_submissions(id) ON DELETE CASCADE NOT NULL,
  learner_id uuid NOT NULL,
  violation_type text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  severity text NOT NULL DEFAULT 'warning',
  timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Plagiarism check results
CREATE TABLE public.plagiarism_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES public.assessment_submissions(id) ON DELETE CASCADE NOT NULL,
  learner_id uuid NOT NULL,
  similarity_score numeric DEFAULT 0,
  flagged_segments jsonb DEFAULT '[]'::jsonb,
  ai_analysis text,
  status text NOT NULL DEFAULT 'pending',
  checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- LTI platform registrations
CREATE TABLE public.lti_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_name text NOT NULL,
  issuer text NOT NULL,
  client_id text NOT NULL,
  auth_endpoint text NOT NULL,
  token_endpoint text NOT NULL,
  jwks_endpoint text NOT NULL,
  deployment_id text,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- LTI resource links (deep linking)
CREATE TABLE public.lti_resource_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid REFERENCES public.lti_registrations(id) ON DELETE CASCADE NOT NULL,
  assessment_id uuid REFERENCES public.assessments(id) ON DELETE CASCADE NOT NULL,
  resource_link_id text NOT NULL,
  title text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.peer_review_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peer_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proctoring_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plagiarism_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lti_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lti_resource_links ENABLE ROW LEVEL SECURITY;

-- Peer review assignment policies
CREATE POLICY "Users can view their peer review assignments"
  ON public.peer_review_assignments FOR SELECT TO authenticated
  USING (reviewer_id = auth.uid() OR reviewee_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','systems_admin','operations','programme_manager','assessor','moderator')));

CREATE POLICY "Admins can manage peer review assignments"
  ON public.peer_review_assignments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','systems_admin','operations','programme_manager')));

-- Peer review policies
CREATE POLICY "Reviewers can manage own reviews"
  ON public.peer_reviews FOR ALL TO authenticated
  USING (reviewer_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','systems_admin','operations','programme_manager','assessor','moderator')));

-- Proctoring violation policies
CREATE POLICY "View proctoring violations"
  ON public.proctoring_violations FOR SELECT TO authenticated
  USING (learner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','systems_admin','operations','programme_manager','assessor')));

CREATE POLICY "Insert proctoring violations"
  ON public.proctoring_violations FOR INSERT TO authenticated
  WITH CHECK (learner_id = auth.uid());

-- Plagiarism check policies
CREATE POLICY "View plagiarism checks"
  ON public.plagiarism_checks FOR SELECT TO authenticated
  USING (learner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','systems_admin','operations','programme_manager','assessor','moderator')));

CREATE POLICY "Admins manage plagiarism checks"
  ON public.plagiarism_checks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','systems_admin','operations','programme_manager')));

-- LTI policies
CREATE POLICY "Admins manage LTI registrations"
  ON public.lti_registrations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','systems_admin')));

CREATE POLICY "Admins manage LTI resource links"
  ON public.lti_resource_links FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','systems_admin','operations','programme_manager')));
