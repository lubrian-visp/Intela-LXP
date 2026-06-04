
-- Token-based AI access control table
CREATE TABLE public.ai_access_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES public.ai_learning_attempts(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL,
  token_hash TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  usage_count INTEGER NOT NULL DEFAULT 0,
  max_usage INTEGER NOT NULL DEFAULT 50,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, learner_id)
);

-- Index for fast token lookup
CREATE INDEX idx_ai_access_tokens_hash ON public.ai_access_tokens (token_hash);
CREATE INDEX idx_ai_access_tokens_attempt ON public.ai_access_tokens (attempt_id, learner_id);

-- Enable RLS
ALTER TABLE public.ai_access_tokens ENABLE ROW LEVEL SECURITY;

-- Learners can read their own tokens
CREATE POLICY "Learners can view own tokens"
  ON public.ai_access_tokens FOR SELECT
  TO authenticated
  USING (learner_id = auth.uid());

-- Learners can insert their own tokens (via edge function)
CREATE POLICY "Learners can insert own tokens"
  ON public.ai_access_tokens FOR INSERT
  TO authenticated
  WITH CHECK (learner_id = auth.uid());

-- Learners can update their own tokens (usage count, revocation)
CREATE POLICY "Learners can update own tokens"
  ON public.ai_access_tokens FOR UPDATE
  TO authenticated
  USING (learner_id = auth.uid());

-- Auto-revoke token on phase transition trigger
CREATE OR REPLACE FUNCTION public.auto_revoke_ai_token_on_phase_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.current_phase IS DISTINCT FROM NEW.current_phase THEN
    UPDATE public.ai_access_tokens
    SET is_revoked = true,
        revoked_at = now(),
        revocation_reason = 'Phase transition: ' || OLD.current_phase || ' → ' || NEW.current_phase
    WHERE attempt_id = NEW.id
      AND is_revoked = false;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_revoke_token_on_phase_change
  AFTER UPDATE OF current_phase ON public.ai_learning_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_revoke_ai_token_on_phase_change();
