
-- Create a function that auto-generates a SHA-256 blockchain hash when a credential is issued
CREATE OR REPLACE FUNCTION public.generate_credential_hash()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate SHA-256 hash from credential data
  NEW.blockchain_hash := '0x' || encode(
    extensions.digest(
      NEW.id::text || NEW.learner_id::text || NEW.programme_id::text || NEW.title || COALESCE(NEW.issued_at::text, now()::text),
      'sha256'
    ),
    'hex'
  );
  -- Auto-generate verification URL
  NEW.verification_url := '/verify-credential?hash=' || substring(NEW.blockchain_hash from 1 for 10);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to fire on INSERT (when credential is first created)
CREATE TRIGGER trg_generate_credential_hash
  BEFORE INSERT ON public.issued_credentials
  FOR EACH ROW
  WHEN (NEW.blockchain_hash IS NULL)
  EXECUTE FUNCTION public.generate_credential_hash();
