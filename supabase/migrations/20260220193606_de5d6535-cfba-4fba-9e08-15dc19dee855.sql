
-- ═══════════════════════════════════════════════════════
-- CORE DATA MODEL: Programmes → Cohorts → Enrolments → Assessments → Credentials
-- ═══════════════════════════════════════════════════════

-- 1. PROGRAMMES
CREATE TABLE public.programmes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  programme_type_id UUID REFERENCES public.programme_types(id),
  country_id UUID REFERENCES public.countries(id),
  qualification_framework_id UUID REFERENCES public.qualification_frameworks(id),
  nqf_level INTEGER,
  credits INTEGER,
  duration_months INTEGER,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived','suspended')),
  theory_percentage INTEGER DEFAULT 50,
  workplace_percentage INTEGER DEFAULT 50,
  manager_id UUID, -- references auth.users indirectly
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.programmes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_programmes_updated_at BEFORE UPDATE ON public.programmes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. COHORTS
CREATE TABLE public.cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  start_date DATE,
  end_date DATE,
  max_learners INTEGER DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','enrolling','active','completed','cancelled')),
  facilitator_id UUID, -- user who facilitates
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_cohorts_updated_at BEFORE UPDATE ON public.cohorts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. ENROLMENTS (learner ↔ cohort)
CREATE TABLE public.enrolments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL, -- auth.users id
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','active','completed','withdrawn','failed')),
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  approved_by UUID,
  mentor_id UUID,
  sponsor_id UUID,
  progress_percentage INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cohort_id, learner_id)
);
ALTER TABLE public.enrolments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_enrolments_updated_at BEFORE UPDATE ON public.enrolments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. MODULES (within a programme)
CREATE TABLE public.programme_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  module_type TEXT DEFAULT 'theory' CHECK (module_type IN ('theory','practical','workplace','integrated')),
  sequence_order INTEGER NOT NULL DEFAULT 1,
  credits INTEGER DEFAULT 0,
  duration_hours INTEGER,
  is_mandatory BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.programme_modules ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_programme_modules_updated_at BEFORE UPDATE ON public.programme_modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. ASSESSMENTS
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES public.programme_modules(id) ON DELETE CASCADE,
  programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assessment_type TEXT NOT NULL DEFAULT 'formative' CHECK (assessment_type IN ('formative','summative','integrated','workplace','portfolio')),
  max_score INTEGER DEFAULT 100,
  pass_mark INTEGER DEFAULT 50,
  weighting NUMERIC(5,2) DEFAULT 100,
  due_date DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON public.assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. ASSESSMENT SUBMISSIONS (learner attempts)
CREATE TABLE public.assessment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL,
  enrolment_id UUID REFERENCES public.enrolments(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','under_review','competent','not_yet_competent','resubmit')),
  score NUMERIC(5,2),
  feedback TEXT,
  assessor_id UUID,
  moderator_id UUID,
  submitted_at TIMESTAMPTZ,
  assessed_at TIMESTAMPTZ,
  moderated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.assessment_submissions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_assessment_submissions_updated_at BEFORE UPDATE ON public.assessment_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. CREDENTIALS (issued upon completion)
CREATE TABLE public.issued_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrolment_id UUID NOT NULL REFERENCES public.enrolments(id),
  learner_id UUID NOT NULL,
  programme_id UUID NOT NULL REFERENCES public.programmes(id),
  credential_type TEXT NOT NULL DEFAULT 'certificate' CHECK (credential_type IN ('certificate','diploma','statement_of_results','digital_badge')),
  title TEXT NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  blockchain_hash TEXT,
  verification_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked','expired','suspended')),
  issued_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.issued_credentials ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_issued_credentials_updated_at BEFORE UPDATE ON public.issued_credentials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. APPROVAL WORKFLOWS (cross-portal task queue)
CREATE TABLE public.approval_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type TEXT NOT NULL CHECK (task_type IN ('enrolment_approval','assessment_moderation','credential_issuance','programme_approval','withdrawal_request')),
  reference_id UUID NOT NULL, -- polymorphic ref to the entity
  reference_table TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','escalated')),
  assigned_to UUID,
  assigned_role TEXT,
  requested_by UUID,
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.approval_tasks ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_approval_tasks_updated_at BEFORE UPDATE ON public.approval_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══════════════════════════════════════════════════════
-- RLS POLICIES (role-based using has_role function)
-- ═══════════════════════════════════════════════════════

-- Helper: get user's role check function already exists as has_role()

-- PROGRAMMES: admins/managers full access, others read active
CREATE POLICY "Admins full access programmes" ON public.programmes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'programme_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'programme_manager'));

CREATE POLICY "Staff can read active programmes" ON public.programmes FOR SELECT TO authenticated
  USING (status = 'active');

-- COHORTS: admins/managers/facilitators manage, others read
CREATE POLICY "Admins manage cohorts" ON public.cohorts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'programme_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'programme_manager'));

CREATE POLICY "Facilitators manage assigned cohorts" ON public.cohorts FOR ALL TO authenticated
  USING (facilitator_id = auth.uid())
  WITH CHECK (facilitator_id = auth.uid());

CREATE POLICY "Authenticated can read cohorts" ON public.cohorts FOR SELECT TO authenticated
  USING (true);

-- ENROLMENTS: learners see own, staff see relevant
CREATE POLICY "Learners see own enrolments" ON public.enrolments FOR SELECT TO authenticated
  USING (learner_id = auth.uid());

CREATE POLICY "Mentors see assigned enrolments" ON public.enrolments FOR SELECT TO authenticated
  USING (mentor_id = auth.uid());

CREATE POLICY "Sponsors see sponsored enrolments" ON public.enrolments FOR SELECT TO authenticated
  USING (sponsor_id = auth.uid());

CREATE POLICY "Admins manage enrolments" ON public.enrolments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'programme_manager') OR public.has_role(auth.uid(), 'operations'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'programme_manager') OR public.has_role(auth.uid(), 'operations'));

CREATE POLICY "Learners can enrol themselves" ON public.enrolments FOR INSERT TO authenticated
  WITH CHECK (learner_id = auth.uid());

-- PROGRAMME MODULES: admins/managers write, all read
CREATE POLICY "Admins manage modules" ON public.programme_modules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'programme_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'programme_manager'));

CREATE POLICY "Authenticated read modules" ON public.programme_modules FOR SELECT TO authenticated
  USING (true);

-- ASSESSMENTS: assessors/admins manage, learners read
CREATE POLICY "Admins manage assessments" ON public.assessments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'programme_manager') OR public.has_role(auth.uid(), 'assessor'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'programme_manager') OR public.has_role(auth.uid(), 'assessor'));

CREATE POLICY "Authenticated read assessments" ON public.assessments FOR SELECT TO authenticated
  USING (true);

-- ASSESSMENT SUBMISSIONS: learners see own, assessors see assigned
CREATE POLICY "Learners see own submissions" ON public.assessment_submissions FOR SELECT TO authenticated
  USING (learner_id = auth.uid());

CREATE POLICY "Learners submit own" ON public.assessment_submissions FOR INSERT TO authenticated
  WITH CHECK (learner_id = auth.uid());

CREATE POLICY "Learners update own pending" ON public.assessment_submissions FOR UPDATE TO authenticated
  USING (learner_id = auth.uid() AND status IN ('pending','resubmit'));

CREATE POLICY "Assessors manage assigned submissions" ON public.assessment_submissions FOR ALL TO authenticated
  USING (assessor_id = auth.uid() OR public.has_role(auth.uid(), 'assessor'))
  WITH CHECK (assessor_id = auth.uid() OR public.has_role(auth.uid(), 'assessor'));

CREATE POLICY "Moderators review submissions" ON public.assessment_submissions FOR ALL TO authenticated
  USING (moderator_id = auth.uid() OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (moderator_id = auth.uid() OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins manage all submissions" ON public.assessment_submissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ISSUED CREDENTIALS: learners see own, admins manage
CREATE POLICY "Learners see own credentials" ON public.issued_credentials FOR SELECT TO authenticated
  USING (learner_id = auth.uid());

CREATE POLICY "Admins manage credentials" ON public.issued_credentials FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'programme_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'programme_manager'));

CREATE POLICY "Public can verify credentials" ON public.issued_credentials FOR SELECT TO anon
  USING (status = 'active');

-- APPROVAL TASKS: assigned users and admins
CREATE POLICY "Users see assigned tasks" ON public.approval_tasks FOR SELECT TO authenticated
  USING (assigned_to = auth.uid() OR requested_by = auth.uid());

CREATE POLICY "Admins manage all tasks" ON public.approval_tasks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'operations'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'operations'));

CREATE POLICY "Assigned users can update tasks" ON public.approval_tasks FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid());

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.enrolments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assessment_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.approval_tasks;
