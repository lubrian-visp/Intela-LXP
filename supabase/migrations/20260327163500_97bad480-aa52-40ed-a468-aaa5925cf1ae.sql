ALTER TABLE public.ai_learning_attempts
  ADD COLUMN IF NOT EXISTS ai_access_level integer NOT NULL DEFAULT 0 CHECK (ai_access_level IN (0, 1, 2, 3));

COMMENT ON COLUMN public.ai_learning_attempts.ai_access_level IS '0=locked, 1=hints only, 2=guided steps, 3=full solution';