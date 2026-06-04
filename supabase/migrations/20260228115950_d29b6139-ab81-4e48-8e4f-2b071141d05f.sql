
-- Create learner_documents table for document upload and verification
CREATE TABLE public.learner_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id uuid NOT NULL REFERENCES public.learner_registrations(id) ON DELETE CASCADE,
  document_type text NOT NULL, -- e.g. 'national_id', 'qualification', 'proof_of_residence', 'medical', 'other'
  document_name text NOT NULL,
  file_path text NOT NULL, -- storage path
  file_size bigint,
  mime_type text,
  status text NOT NULL DEFAULT 'pending_review', -- pending_review, verified, rejected, expired
  rejection_reason text,
  verified_by uuid,
  verified_at timestamptz,
  uploaded_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.learner_documents ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Staff manage learner documents"
ON public.learner_documents FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'operations'::app_role)
  OR has_role(auth.uid(), 'programme_manager'::app_role)
  OR has_role(auth.uid(), 'facilitator'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'operations'::app_role)
  OR has_role(auth.uid(), 'programme_manager'::app_role)
  OR has_role(auth.uid(), 'facilitator'::app_role)
);

CREATE POLICY "Compliance officers verify documents"
ON public.learner_documents FOR ALL
USING (has_role(auth.uid(), 'assessor'::app_role))
WITH CHECK (has_role(auth.uid(), 'assessor'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_learner_documents_updated_at
  BEFORE UPDATE ON public.learner_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for learner documents
INSERT INTO storage.buckets (id, name, public) VALUES ('learner-documents', 'learner-documents', false);

-- Storage policies for learner-documents bucket
CREATE POLICY "Staff upload learner documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'learner-documents'
  AND (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
    OR has_role(auth.uid(), 'programme_manager'::app_role)
    OR has_role(auth.uid(), 'facilitator'::app_role)
  )
);

CREATE POLICY "Staff read learner documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'learner-documents'
  AND (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
    OR has_role(auth.uid(), 'programme_manager'::app_role)
    OR has_role(auth.uid(), 'facilitator'::app_role)
    OR has_role(auth.uid(), 'assessor'::app_role)
  )
);

CREATE POLICY "Staff delete learner documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'learner-documents'
  AND (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
  )
);

-- Trigger: audit document verification
CREATE OR REPLACE FUNCTION public.audit_document_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.onboarding_audit_log (entity_type, entity_id, action, performed_by, details)
    VALUES (
      'learner_document',
      NEW.id,
      CASE
        WHEN NEW.status = 'verified' THEN 'document_verified'
        WHEN NEW.status = 'rejected' THEN 'document_rejected'
        ELSE 'document_status_changed'
      END,
      NEW.verified_by,
      jsonb_build_object(
        'registration_id', NEW.registration_id,
        'document_type', NEW.document_type,
        'document_name', NEW.document_name,
        'previous_status', OLD.status,
        'new_status', NEW.status,
        'rejection_reason', NEW.rejection_reason
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_learner_document_change
  AFTER UPDATE ON public.learner_documents
  FOR EACH ROW EXECUTE FUNCTION public.audit_document_verification();
