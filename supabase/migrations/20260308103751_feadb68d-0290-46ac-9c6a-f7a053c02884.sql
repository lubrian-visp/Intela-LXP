
-- Add optional learner_id to expenditures for per-learner tagging
ALTER TABLE public.sponsor_sd_expenditures
ADD COLUMN learner_id uuid DEFAULT NULL;

-- Index for per-learner queries
CREATE INDEX idx_sd_expenditures_learner ON public.sponsor_sd_expenditures(learner_id) WHERE learner_id IS NOT NULL;
