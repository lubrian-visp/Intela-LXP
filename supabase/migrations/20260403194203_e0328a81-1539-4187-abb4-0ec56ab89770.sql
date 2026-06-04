
-- Add per-programme AI workflow toggle (null = inherit global setting)
ALTER TABLE public.programmes ADD COLUMN IF NOT EXISTS ai_workflow_enabled boolean DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.programmes.ai_workflow_enabled IS 'Per-programme AI workflow override. NULL = use global setting, true = enabled, false = disabled.';
