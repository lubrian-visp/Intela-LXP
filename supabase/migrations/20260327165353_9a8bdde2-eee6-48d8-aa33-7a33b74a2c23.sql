
-- Adaptive learning rules table
CREATE TABLE public.ai_adaptive_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text NOT NULL UNIQUE,
  rule_name text NOT NULL,
  description text,
  condition_metric text NOT NULL,
  condition_operator text NOT NULL DEFAULT 'gte',
  condition_threshold numeric NOT NULL,
  action_type text NOT NULL,
  action_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_adaptive_rules ENABLE ROW LEVEL SECURITY;

-- Read access for authenticated users (rules are read by edge functions via service role, but admins can view)
CREATE POLICY "Authenticated users can read adaptive rules"
  ON public.ai_adaptive_rules FOR SELECT TO authenticated USING (true);

-- Only platform admins can modify
CREATE POLICY "Platform admins can manage adaptive rules"
  ON public.ai_adaptive_rules FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- Learner adaptive history (tracks which adaptations were applied per attempt)
CREATE TABLE public.ai_adaptive_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL,
  attempt_id uuid NOT NULL REFERENCES public.ai_learning_attempts(id) ON DELETE CASCADE,
  rule_id uuid NOT NULL REFERENCES public.ai_adaptive_rules(id) ON DELETE CASCADE,
  triggered_metric text NOT NULL,
  triggered_value numeric NOT NULL,
  action_applied jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_adaptive_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own adaptive history"
  ON public.ai_adaptive_history FOR SELECT TO authenticated
  USING (learner_id = auth.uid());

CREATE POLICY "Service role full access adaptive history"
  ON public.ai_adaptive_history FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Updated at trigger
CREATE TRIGGER set_updated_at_ai_adaptive_rules
  BEFORE UPDATE ON public.ai_adaptive_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default rules
INSERT INTO public.ai_adaptive_rules (rule_key, rule_name, description, condition_metric, condition_operator, condition_threshold, action_type, action_params, priority) VALUES
  ('high_dependency_restrict', 'High AI Dependency - Restrict Access', 'When ADS exceeds threshold, restrict AI to hints only and reduce max interactions', 'ai_dependency_score', 'gte', 70, 'restrict_ai', '{"max_ai_level": 1, "max_interactions": 3, "message": "Your AI dependency is high. AI has been restricted to hints only to encourage independent thinking."}'::jsonb, 10),
  ('low_dqs_extra_reflection', 'Low Decision Quality - Extra Reflection', 'When DQS is below threshold, require additional reflection fields and minimum word count', 'decision_quality_score', 'lte', 40, 'enhance_reflection', '{"min_word_count": 200, "require_all_fields": true, "additional_prompts": ["Explain why you accepted or rejected each AI suggestion.", "What would you do differently next time?"], "message": "Your decision quality needs improvement. Additional reflection tasks have been added."}'::jsonb, 20),
  ('strong_performance_escalate', 'Strong Performance - Increase Difficulty', 'When composite score is high, reduce time allowance and raise quality gate', 'composite_score', 'gte', 80, 'escalate_difficulty', '{"time_reduction_percent": 30, "quality_gate_multiplier": 1.3, "message": "Excellent performance! The difficulty has been increased to match your skill level."}'::jsonb, 30),
  ('very_high_dependency_lock', 'Very High Dependency - Lock AI', 'When ADS exceeds critical threshold, lock AI entirely for next attempt', 'ai_dependency_score', 'gte', 90, 'lock_ai', '{"disable_ai": true, "message": "AI access has been temporarily disabled due to very high dependency. Complete this attempt independently."}'::jsonb, 5),
  ('low_reflection_retry', 'Low Reflection Depth - Require Retry', 'When RDS is very low, require reflection resubmission', 'reflection_depth_score', 'lte', 30, 'retry_reflection', '{"max_retries": 2, "min_score_to_pass": 50, "message": "Your reflection needs more depth. Please revise and resubmit."}'::jsonb, 15);
