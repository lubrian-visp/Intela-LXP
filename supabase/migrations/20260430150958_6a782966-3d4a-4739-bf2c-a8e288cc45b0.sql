
-- ============================================================
-- GRADING SYSTEM — International Best Practices
-- - Activity grades (non-assessment)
-- - Configurable grading scales (NQF, Competency)
-- - Unified gradebook view
-- - 4-eyes moderation
-- - Strict RLS + audit
-- ============================================================

-- 1. GRADING SCALES (programme-configurable)
CREATE TABLE public.grading_scales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  scale_type text NOT NULL CHECK (scale_type IN ('percentage', 'competency', 'letter', 'points')),
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.grading_scale_bands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scale_id uuid NOT NULL REFERENCES public.grading_scales(id) ON DELETE CASCADE,
  label text NOT NULL,            -- 'Distinction', 'Competent'
  short_code text,                -- 'D', 'C'
  min_score numeric(5,2),         -- nullable for non-numeric
  max_score numeric(5,2),
  is_pass boolean NOT NULL DEFAULT false,
  colour_token text NOT NULL DEFAULT 'muted',  -- 'success','warning','destructive','info','accent'
  sequence_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Per-programme override
CREATE TABLE public.programme_grading_scales (
  programme_id uuid PRIMARY KEY REFERENCES public.programmes(id) ON DELETE CASCADE,
  scale_id uuid NOT NULL REFERENCES public.grading_scales(id) ON DELETE RESTRICT,
  assigned_by uuid,
  assigned_at timestamptz NOT NULL DEFAULT now()
);

-- 2. ACTIVITY GRADES (non-assessment learning activities)
CREATE TABLE public.activity_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL,
  enrolment_id uuid REFERENCES public.enrolments(id) ON DELETE SET NULL,
  programme_id uuid REFERENCES public.programmes(id) ON DELETE SET NULL,
  cohort_id uuid REFERENCES public.cohorts(id) ON DELETE SET NULL,
  activity_type text NOT NULL CHECK (activity_type IN (
    'participation','practical','project','presentation','attendance','peer_review','workshop','reflection','other'
  )),
  activity_title text NOT NULL,
  activity_date date NOT NULL DEFAULT CURRENT_DATE,
  score numeric(5,2),
  max_score numeric(5,2) NOT NULL DEFAULT 100,
  weighting numeric(5,2) NOT NULL DEFAULT 1.0,
  feedback text,
  evidence_url text,
  recorded_by uuid NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  -- Moderation (4-eyes)
  moderation_status text NOT NULL DEFAULT 'not_required'
    CHECK (moderation_status IN ('not_required','pending','approved','rejected','flagged')),
  moderated_by uuid,
  moderated_at timestamptz,
  moderation_notes text,
  -- Lifecycle
  status text NOT NULL DEFAULT 'recorded'
    CHECK (status IN ('draft','recorded','published','withdrawn')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_grades_learner ON public.activity_grades(learner_id);
CREATE INDEX idx_activity_grades_programme ON public.activity_grades(programme_id);
CREATE INDEX idx_activity_grades_cohort ON public.activity_grades(cohort_id);
CREATE INDEX idx_activity_grades_recorded_by ON public.activity_grades(recorded_by);

-- 3. AUDIT TRAIL for grade changes
CREATE TABLE public.grade_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_source text NOT NULL CHECK (grade_source IN ('assessment_submission','activity_grade')),
  grade_id uuid NOT NULL,
  learner_id uuid NOT NULL,
  action text NOT NULL,  -- 'created','updated','moderated','withdrawn'
  previous_score numeric(5,2),
  new_score numeric(5,2),
  previous_status text,
  new_status text,
  changed_by uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_grade_audit_learner ON public.grade_audit_log(learner_id);
CREATE INDEX idx_grade_audit_grade ON public.grade_audit_log(grade_source, grade_id);

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE TRIGGER trg_grading_scales_updated_at
  BEFORE UPDATE ON public.grading_scales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_activity_grades_updated_at
  BEFORE UPDATE ON public.activity_grades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4-eyes enforcement: cannot moderate own grade
CREATE OR REPLACE FUNCTION public.enforce_grade_four_eyes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.moderated_by IS NOT NULL AND NEW.moderated_by = NEW.recorded_by THEN
    RAISE EXCEPTION 'Four-eyes violation: moderator cannot be the same person who recorded the grade.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_activity_grade_four_eyes
  BEFORE INSERT OR UPDATE ON public.activity_grades
  FOR EACH ROW EXECUTE FUNCTION public.enforce_grade_four_eyes();

-- Audit on activity grade changes
CREATE OR REPLACE FUNCTION public.audit_activity_grade_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.grade_audit_log (grade_source, grade_id, learner_id, action, new_score, new_status, changed_by)
    VALUES ('activity_grade', NEW.id, NEW.learner_id, 'created', NEW.score, NEW.status, COALESCE(NEW.recorded_by, auth.uid()));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.score IS DISTINCT FROM NEW.score OR OLD.status IS DISTINCT FROM NEW.status OR OLD.moderation_status IS DISTINCT FROM NEW.moderation_status THEN
      INSERT INTO public.grade_audit_log (grade_source, grade_id, learner_id, action, previous_score, new_score, previous_status, new_status, changed_by)
      VALUES ('activity_grade', NEW.id, NEW.learner_id,
        CASE WHEN OLD.moderation_status IS DISTINCT FROM NEW.moderation_status THEN 'moderated' ELSE 'updated' END,
        OLD.score, NEW.score, OLD.status, NEW.status, COALESCE(auth.uid(), NEW.recorded_by));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_activity_grade
  AFTER INSERT OR UPDATE ON public.activity_grades
  FOR EACH ROW EXECUTE FUNCTION public.audit_activity_grade_change();

-- ============================================================
-- ENABLE RLS
-- ============================================================
ALTER TABLE public.grading_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_scale_bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programme_grading_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_audit_log ENABLE ROW LEVEL SECURITY;

-- Grading scales: readable by all authenticated; manageable by admins/PM/ops
CREATE POLICY "Authenticated read grading scales"
  ON public.grading_scales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage grading scales"
  ON public.grading_scales FOR ALL TO authenticated
  USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'systems_admin') OR has_role(auth.uid(),'operations') OR has_role(auth.uid(),'programme_manager'))
  WITH CHECK (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'systems_admin') OR has_role(auth.uid(),'operations') OR has_role(auth.uid(),'programme_manager'));

CREATE POLICY "Authenticated read scale bands"
  ON public.grading_scale_bands FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage scale bands"
  ON public.grading_scale_bands FOR ALL TO authenticated
  USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'systems_admin') OR has_role(auth.uid(),'operations') OR has_role(auth.uid(),'programme_manager'))
  WITH CHECK (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'systems_admin') OR has_role(auth.uid(),'operations') OR has_role(auth.uid(),'programme_manager'));

CREATE POLICY "Authenticated read programme scales"
  ON public.programme_grading_scales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage programme scales"
  ON public.programme_grading_scales FOR ALL TO authenticated
  USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'operations') OR has_role(auth.uid(),'programme_manager'))
  WITH CHECK (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'operations') OR has_role(auth.uid(),'programme_manager'));

-- Activity grades RLS
CREATE POLICY "Learners read own activity grades"
  ON public.activity_grades FOR SELECT TO authenticated
  USING (learner_id = auth.uid() AND status = 'published');

CREATE POLICY "Staff read activity grades"
  ON public.activity_grades FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'systems_admin')
    OR has_role(auth.uid(),'operations') OR has_role(auth.uid(),'programme_manager')
    OR has_role(auth.uid(),'facilitator') OR has_role(auth.uid(),'assessor')
    OR has_role(auth.uid(),'moderator')
  );

CREATE POLICY "Assessors and facilitators record activity grades"
  ON public.activity_grades FOR INSERT TO authenticated
  WITH CHECK (
    recorded_by = auth.uid() AND (
      has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'operations')
      OR has_role(auth.uid(),'programme_manager') OR has_role(auth.uid(),'facilitator')
      OR has_role(auth.uid(),'assessor')
    )
  );

CREATE POLICY "Recorders update own draft/recorded grades"
  ON public.activity_grades FOR UPDATE TO authenticated
  USING (
    (recorded_by = auth.uid() AND status IN ('draft','recorded'))
    OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'operations')
    OR has_role(auth.uid(),'programme_manager')
    OR has_role(auth.uid(),'moderator')
  )
  WITH CHECK (
    has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'operations')
    OR has_role(auth.uid(),'programme_manager') OR has_role(auth.uid(),'moderator')
    OR (recorded_by = auth.uid() AND status IN ('draft','recorded'))
  );

CREATE POLICY "Admins delete activity grades"
  ON public.activity_grades FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'operations'));

-- Grade audit log: read-only for staff and learner (own only)
CREATE POLICY "Learners read own audit log"
  ON public.grade_audit_log FOR SELECT TO authenticated
  USING (learner_id = auth.uid());
CREATE POLICY "Staff read all audit log"
  ON public.grade_audit_log FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'systems_admin')
    OR has_role(auth.uid(),'operations') OR has_role(auth.uid(),'programme_manager')
    OR has_role(auth.uid(),'moderator') OR has_role(auth.uid(),'facilitator')
  );

-- ============================================================
-- UNIFIED GRADEBOOK VIEW (consolidates assessment + activity)
-- ============================================================
CREATE OR REPLACE VIEW public.unified_gradebook
WITH (security_invoker = true) AS
SELECT
  'assessment'::text AS source,
  asub.id AS grade_id,
  asub.learner_id,
  a.programme_id,
  a.id AS activity_id,
  a.title AS activity_title,
  'assessment'::text AS activity_type,
  asub.score,
  a.max_score,
  a.pass_mark,
  asub.status,
  asub.moderation_status,
  asub.feedback,
  asub.assessor_id AS recorded_by,
  asub.moderator_id AS moderated_by,
  asub.submitted_at AS activity_date,
  asub.assessed_at AS graded_at,
  asub.created_at,
  asub.updated_at
FROM public.assessment_submissions asub
JOIN public.assessments a ON a.id = asub.assessment_id

UNION ALL

SELECT
  'activity'::text AS source,
  ag.id AS grade_id,
  ag.learner_id,
  ag.programme_id,
  ag.id AS activity_id,
  ag.activity_title,
  ag.activity_type,
  ag.score,
  ag.max_score,
  NULL::numeric AS pass_mark,
  ag.status,
  ag.moderation_status,
  ag.feedback,
  ag.recorded_by,
  ag.moderated_by,
  ag.activity_date::timestamptz,
  ag.recorded_at AS graded_at,
  ag.created_at,
  ag.updated_at
FROM public.activity_grades ag;

-- ============================================================
-- SEED DEFAULT GRADING SCALES
-- ============================================================
WITH nqf AS (
  INSERT INTO public.grading_scales (name, description, scale_type, is_default, is_active)
  VALUES ('SA NQF Percentage', 'South African NQF percentage bands aligned with SAQA conventions', 'percentage', true, true)
  RETURNING id
)
INSERT INTO public.grading_scale_bands (scale_id, label, short_code, min_score, max_score, is_pass, colour_token, sequence_order)
SELECT id, label, code, lo, hi, pass, colour, ord FROM nqf,
  (VALUES
    ('Distinction','D',80,100,true,'success',1),
    ('Merit','M',70,79.99,true,'info',2),
    ('Pass','P',50,69.99,true,'accent',3),
    ('Borderline','B',45,49.99,false,'warning',4),
    ('Fail','F',0,44.99,false,'destructive',5)
  ) AS v(label,code,lo,hi,pass,colour,ord);

WITH comp AS (
  INSERT INTO public.grading_scales (name, description, scale_type, is_default, is_active)
  VALUES ('Competency-Based', 'Competent / Not Yet Competent (SETA-aligned)', 'competency', false, true)
  RETURNING id
)
INSERT INTO public.grading_scale_bands (scale_id, label, short_code, min_score, max_score, is_pass, colour_token, sequence_order)
SELECT id, label, code, lo, hi, pass, colour, ord FROM comp,
  (VALUES
    ('Competent','C',60,100,true,'success',1),
    ('Not Yet Competent','NYC',0,59.99,false,'destructive',2)
  ) AS v(label,code,lo,hi,pass,colour,ord);
