
-- Staff verification checklist items (mirrors learner verification pattern)
CREATE TABLE public.staff_verification_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID NOT NULL REFERENCES public.staff_registrations(id) ON DELETE CASCADE,
  section TEXT NOT NULL, -- identity, qualification, compliance, eligibility, document
  check_name TEXT NOT NULL,
  check_label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, passed, failed, flagged, not_applicable
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  notes TEXT,
  evidence_document_id UUID,
  is_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(registration_id, check_name)
);

ALTER TABLE public.staff_verification_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff admins manage verification items"
  ON public.staff_verification_items FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role));

CREATE POLICY "Programme managers read verification items"
  ON public.staff_verification_items FOR SELECT
  USING (has_role(auth.uid(), 'programme_manager'::app_role));

-- Staff document requests (secure upload link)
CREATE TABLE public.staff_document_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID NOT NULL REFERENCES public.staff_registrations(id) ON DELETE CASCADE,
  requested_by UUID,
  document_types TEXT[] NOT NULL DEFAULT '{}',
  message TEXT,
  secure_upload_token TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, fulfilled, expired
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  fulfilled_at TIMESTAMPTZ,
  reminder_count INTEGER NOT NULL DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_document_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff admins manage document requests"
  ON public.staff_document_requests FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role));

-- Trigger to auto-seed verification checklist on staff registration
CREATE OR REPLACE FUNCTION public.seed_staff_verification_checklist()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.staff_verification_items (registration_id, section, check_name, check_label, is_required) VALUES
    -- Identity
    (NEW.id, 'identity', 'id_document', 'ID Document / Passport Verified', true),
    (NEW.id, 'identity', 'photo_match', 'Photo Matches Application', true),
    (NEW.id, 'identity', 'address_proof', 'Proof of Address Verified', false),
    -- Qualification
    (NEW.id, 'qualification', 'qualification_cert', 'Qualifications Authenticated', true),
    (NEW.id, 'qualification', 'professional_reg', 'Professional Registration Verified', false),
    (NEW.id, 'qualification', 'experience_verified', 'Relevant Experience Confirmed', false),
    -- Compliance
    (NEW.id, 'compliance', 'background_check', 'Background Check Cleared', true),
    (NEW.id, 'compliance', 'police_clearance', 'Police Clearance Certificate', true),
    (NEW.id, 'compliance', 'reference_check', 'Reference Check Completed', false),
    (NEW.id, 'compliance', 'conflict_of_interest', 'Conflict of Interest Declaration', false),
    -- Eligibility
    (NEW.id, 'eligibility', 'role_eligibility', 'Role Eligibility Confirmed', true),
    (NEW.id, 'eligibility', 'right_to_work', 'Right to Work Verified', true),
    (NEW.id, 'eligibility', 'contract_signed', 'Employment Contract Signed', false),
    -- Document
    (NEW.id, 'document', 'cv_reviewed', 'CV Reviewed', true),
    (NEW.id, 'document', 'all_docs_complete', 'All Required Documents Submitted', true),
    (NEW.id, 'document', 'docs_authenticity', 'Document Authenticity Confirmed', true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_seed_staff_verification
  AFTER INSERT ON public.staff_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_staff_verification_checklist();

-- Add verified status to staff_registrations
-- Update trigger for staff_verification_items
CREATE OR REPLACE FUNCTION public.update_staff_verification_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_staff_verification_items_updated_at
  BEFORE UPDATE ON public.staff_verification_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_staff_verification_items_updated_at();
