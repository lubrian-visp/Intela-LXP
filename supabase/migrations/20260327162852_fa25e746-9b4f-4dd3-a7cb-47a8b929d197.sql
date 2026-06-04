
-- ═══════════════════════════════════════════════════════════
-- AI Learning Workflow: 3-Phase Controlled Learning System
-- ═══════════════════════════════════════════════════════════

-- 1. Scoring configuration (admin-configurable thresholds)
CREATE TABLE public.ai_scoring_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text NOT NULL UNIQUE,
  config_value jsonb NOT NULL DEFAULT '{}',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_scoring_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage scoring config"
  ON public.ai_scoring_config FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Authenticated users can read scoring config"
  ON public.ai_scoring_config FOR SELECT TO authenticated
  USING (true);

-- 2. Learning attempts (tracks phase state per learner per content)
CREATE TABLE public.ai_learning_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL,
  content_block_id uuid REFERENCES public.content_blocks(id) ON DELETE CASCADE,
  assessment_id uuid REFERENCES public.assessments(id) ON DELETE CASCADE,
  programme_id uuid REFERENCES public.programmes(id) ON DELETE SET NULL,
  current_phase text NOT NULL DEFAULT 'manual_attempt' CHECK (current_phase IN ('manual_attempt', 'ai_assisted', 'reflection', 'completed')),
  -- Phase 1: Manual attempt
  initial_attempt_text text,
  initial_attempt_submitted_at timestamptz,
  time_spent_seconds integer DEFAULT 0,
  attempt_quality_score numeric(5,2),
  -- Phase 2: AI-assisted
  ai_phase_started_at timestamptz,
  ai_interaction_count integer DEFAULT 0,
  revised_solution_text text,
  revised_solution_submitted_at timestamptz,
  -- Phase 3: Reflection
  reflection_started_at timestamptz,
  -- Scores
  ai_dependency_score numeric(5,2),
  decision_quality_score numeric(5,2),
  reflection_depth_score numeric(5,2),
  composite_score numeric(5,2),
  -- Metadata
  is_ai_enabled boolean NOT NULL DEFAULT false,
  phase_gate_reason text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_learning_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners can manage own attempts"
  ON public.ai_learning_attempts FOR ALL TO authenticated
  USING (learner_id = auth.uid())
  WITH CHECK (learner_id = auth.uid());

CREATE POLICY "Staff can view all attempts"
  ON public.ai_learning_attempts FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'operations'::app_role)
    OR public.has_role(auth.uid(), 'programme_manager'::app_role)
    OR public.has_role(auth.uid(), 'facilitator'::app_role)
    OR public.has_role(auth.uid(), 'assessor'::app_role)
  );

CREATE INDEX idx_ai_learning_attempts_learner ON public.ai_learning_attempts(learner_id);
CREATE INDEX idx_ai_learning_attempts_content ON public.ai_learning_attempts(content_block_id);
CREATE INDEX idx_ai_learning_attempts_assessment ON public.ai_learning_attempts(assessment_id);

-- 3. AI interaction logs (immutable audit trail)
CREATE TABLE public.ai_interaction_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.ai_learning_attempts(id) ON DELETE CASCADE,
  learner_id uuid NOT NULL,
  request_prompt text NOT NULL,
  response_text text NOT NULL,
  model_used text,
  tokens_used integer,
  suggestion_accepted boolean,
  suggestion_improved boolean,
  interaction_duration_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_interaction_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners can view own logs"
  ON public.ai_interaction_logs FOR SELECT TO authenticated
  USING (learner_id = auth.uid());

CREATE POLICY "Learners can insert own logs"
  ON public.ai_interaction_logs FOR INSERT TO authenticated
  WITH CHECK (learner_id = auth.uid());

CREATE POLICY "Staff can view all logs"
  ON public.ai_interaction_logs FOR SELECT TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR public.has_role(auth.uid(), 'operations'::app_role)
    OR public.has_role(auth.uid(), 'assessor'::app_role)
  );

CREATE INDEX idx_ai_interaction_logs_attempt ON public.ai_interaction_logs(attempt_id);
CREATE INDEX idx_ai_interaction_logs_learner ON public.ai_interaction_logs(learner_id);

-- 4. Reflections
CREATE TABLE public.ai_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.ai_learning_attempts(id) ON DELETE CASCADE,
  learner_id uuid NOT NULL,
  reflection_text text NOT NULL,
  changes_cited text,
  reasoning_depth text,
  learning_objectives_connection text,
  ai_scored_rds numeric(5,2),
  ai_scoring_rationale text,
  is_validated boolean DEFAULT false,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners can manage own reflections"
  ON public.ai_reflections FOR ALL TO authenticated
  USING (learner_id = auth.uid())
  WITH CHECK (learner_id = auth.uid());

CREATE POLICY "Staff can view all reflections"
  ON public.ai_reflections FOR SELECT TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR public.has_role(auth.uid(), 'operations'::app_role)
    OR public.has_role(auth.uid(), 'assessor'::app_role)
    OR public.has_role(auth.uid(), 'facilitator'::app_role)
  );

CREATE INDEX idx_ai_reflections_attempt ON public.ai_reflections(attempt_id);
CREATE INDEX idx_ai_reflections_learner ON public.ai_reflections(learner_id);

-- 5. Seed default scoring configuration
INSERT INTO public.ai_scoring_config (config_key, config_value, description) VALUES
  ('phase_gate_min_time_seconds', '300', 'Minimum time (seconds) learner must spend before AI unlocks'),
  ('phase_gate_min_quality_score', '30', 'Minimum attempt quality score (0-100) to unlock AI'),
  ('phase_gate_quality_or_time', '"either"', 'Gate mode: "either" (time OR quality), "both", "time_only", "quality_only"'),
  ('max_ai_interactions', '10', 'Maximum AI interactions allowed per attempt'),
  ('min_reflection_score', '40', 'Minimum RDS required to complete workflow'),
  ('ads_weight', '0.3', 'Weight of AI Dependency Score in composite'),
  ('dqs_weight', '0.4', 'Weight of Decision Quality Score in composite'),
  ('rds_weight', '0.3', 'Weight of Reflection Depth Score in composite'),
  ('ai_workflow_enabled', 'true', 'Global toggle for AI learning workflow');

-- 6. Updated_at triggers
CREATE TRIGGER update_ai_learning_attempts_updated_at
  BEFORE UPDATE ON public.ai_learning_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_scoring_config_updated_at
  BEFORE UPDATE ON public.ai_scoring_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_reflections_updated_at
  BEFORE UPDATE ON public.ai_reflections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
