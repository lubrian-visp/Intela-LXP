
-- Enhanced scoring support columns
ALTER TABLE public.ai_interaction_logs
  ADD COLUMN IF NOT EXISTS accepted_without_change boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS was_bad_suggestion boolean DEFAULT false;

ALTER TABLE public.ai_learning_attempts
  ADD COLUMN IF NOT EXISTS ads_frequency_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS ads_timing_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS ads_acceptance_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS dqs_improvement_delta numeric(5,2),
  ADD COLUMN IF NOT EXISTS dqs_critique_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS dqs_blind_penalty numeric(5,2),
  ADD COLUMN IF NOT EXISTS rds_relevance_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS rds_error_identification numeric(5,2),
  ADD COLUMN IF NOT EXISTS rds_reasoning_quality numeric(5,2);

COMMENT ON COLUMN public.ai_interaction_logs.accepted_without_change IS 'Learner accepted suggestion but made no meaningful change';
COMMENT ON COLUMN public.ai_interaction_logs.was_bad_suggestion IS 'Learner correctly rejected a poor AI suggestion';
