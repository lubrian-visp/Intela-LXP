
-- ═══════════════════════════════════════════════════════════
-- PHASE 1: Foundation Migration
-- Learner Number, Verification Checklist, Validation Mode, SLA
-- ═══════════════════════════════════════════════════════════

-- 1. Auto-generated immutable Learner Number sequence
CREATE SEQUENCE IF NOT EXISTS public.learner_number_seq START WITH 10001 INCREMENT BY 1;

-- Add learner_number column if not exists
ALTER TABLE public.learner_registrations
ADD COLUMN IF NOT EXISTS learner_number text UNIQUE;

-- Function to auto-generate learner number on insert
CREATE OR REPLACE FUNCTION public.generate_learner_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.learner_number IS NULL THEN
    NEW.learner_number := 'LRN-' || LPAD(nextval('learner_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_learner_number
BEFORE INSERT ON public.learner_registrations
FOR EACH ROW EXECUTE FUNCTION public.generate_learner_number();

-- Prevent learner_number from being changed after creation
CREATE OR REPLACE FUNCTION public.protect_learner_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.learner_number IS NOT NULL AND NEW.learner_number IS DISTINCT FROM OLD.learner_number THEN
    RAISE EXCEPTION 'Learner Number is immutable and cannot be changed.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_learner_number
BEFORE UPDATE ON public.learner_registrations
FOR EACH ROW EXECUTE FUNCTION public.protect_learner_number();

-- Backfill existing registrations that have no learner_number
UPDATE public.learner_registrations
SET learner_number = 'LRN-' || LPAD(nextval('learner_number_seq')::text, 6, '0')
WHERE learner_number IS NULL;

-- 2. SLA tracking columns on learner_registrations
ALTER TABLE public.learner_registrations
ADD COLUMN IF NOT EXISTS sla_started_at timestamptz,
ADD COLUMN IF NOT EXISTS sla_paused_at timestamptz,
ADD COLUMN IF NOT EXISTS sla_paused_duration_minutes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS sla_deadline_at timestamptz,
ADD COLUMN IF NOT EXISTS sla_breached boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- Auto-set SLA start when status becomes pending_approval
CREATE OR REPLACE FUNCTION public.manage_sla_timer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _sla_hours integer := 48; -- Default 48-hour SLA
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Start SLA on submission/pending
    IF NEW.status IN ('pending_approval', 'submitted') AND NEW.sla_started_at IS NULL THEN
      NEW.sla_started_at := now();
      NEW.sla_deadline_at := now() + (_sla_hours || ' hours')::interval;
    END IF;

    -- Pause SLA when waiting on learner (returned for revision)
    IF NEW.status = 'returned_for_revision' AND NEW.sla_paused_at IS NULL THEN
      NEW.sla_paused_at := now();
    END IF;

    -- Resume SLA when resubmitted
    IF OLD.status = 'returned_for_revision' AND NEW.status IN ('pending_approval', 'submitted', 'resubmitted') THEN
      IF OLD.sla_paused_at IS NOT NULL THEN
        NEW.sla_paused_duration_minutes := COALESCE(OLD.sla_paused_duration_minutes, 0)
          + EXTRACT(EPOCH FROM (now() - OLD.sla_paused_at))::integer / 60;
        NEW.sla_paused_at := NULL;
        -- Extend deadline by paused duration
        NEW.sla_deadline_at := OLD.sla_deadline_at + (NEW.sla_paused_duration_minutes || ' minutes')::interval;
      END IF;
    END IF;

    -- Clear SLA on terminal states
    IF NEW.status IN ('approved', 'rejected', 'enrolled') THEN
      NEW.sla_paused_at := NULL;
    END IF;
  END IF;

  -- Check breach
  IF NEW.sla_deadline_at IS NOT NULL AND NEW.sla_paused_at IS NULL
     AND NEW.status NOT IN ('approved', 'rejected', 'enrolled')
     AND now() > NEW.sla_deadline_at THEN
    NEW.sla_breached := true;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_manage_sla_timer
BEFORE UPDATE ON public.learner_registrations
FOR EACH ROW EXECUTE FUNCTION public.manage_sla_timer();

-- Also trigger on insert for new registrations that start as pending
CREATE TRIGGER trg_manage_sla_timer_insert
BEFORE INSERT ON public.learner_registrations
FOR EACH ROW EXECUTE FUNCTION public.manage_sla_timer();

-- 3. Add resubmitted status support (status text already flexible)

-- 4. Verification Checklist Items table
CREATE TABLE public.verification_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.learner_registrations(id) ON DELETE CASCADE,
  section text NOT NULL,  -- 'identity', 'eligibility', 'document', 'compliance'
  check_name text NOT NULL,
  check_label text NOT NULL,
  status text NOT NULL DEFAULT 'pending',  -- 'pending', 'passed', 'failed', 'flagged', 'not_applicable'
  verified_by uuid,
  verified_at timestamptz,
  notes text,
  evidence_document_id uuid REFERENCES public.learner_documents(id),
  is_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(registration_id, section, check_name)
);

ALTER TABLE public.verification_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage verification checklist"
ON public.verification_checklist_items FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'operations'::app_role) OR
  has_role(auth.uid(), 'programme_manager'::app_role) OR
  has_role(auth.uid(), 'facilitator'::app_role) OR
  has_role(auth.uid(), 'assessor'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'operations'::app_role) OR
  has_role(auth.uid(), 'programme_manager'::app_role) OR
  has_role(auth.uid(), 'facilitator'::app_role) OR
  has_role(auth.uid(), 'assessor'::app_role)
);

CREATE TRIGGER update_verification_checklist_updated_at
BEFORE UPDATE ON public.verification_checklist_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit trigger for checklist changes
CREATE OR REPLACE FUNCTION public.audit_verification_checklist_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.onboarding_audit_log (entity_type, entity_id, action, performed_by, details)
    VALUES (
      'verification_checklist',
      NEW.id,
      CASE
        WHEN NEW.status = 'passed' THEN 'check_passed'
        WHEN NEW.status = 'failed' THEN 'check_failed'
        WHEN NEW.status = 'flagged' THEN 'check_flagged'
        ELSE 'check_status_changed'
      END,
      NEW.verified_by,
      jsonb_build_object(
        'registration_id', NEW.registration_id,
        'section', NEW.section,
        'check_name', NEW.check_name,
        'check_label', NEW.check_label,
        'previous_status', OLD.status,
        'new_status', NEW.status,
        'notes', NEW.notes
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_verification_checklist
AFTER UPDATE ON public.verification_checklist_items
FOR EACH ROW EXECUTE FUNCTION public.audit_verification_checklist_change();

-- 5. Auto-generate checklist when registration is created
CREATE OR REPLACE FUNCTION public.auto_generate_verification_checklist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Identity checks
  INSERT INTO verification_checklist_items (registration_id, section, check_name, check_label) VALUES
    (NEW.id, 'identity', 'name_verified', 'Full name matches official document'),
    (NEW.id, 'identity', 'dob_verified', 'Date of birth verified'),
    (NEW.id, 'identity', 'id_number_verified', 'National ID / Passport number verified'),
    (NEW.id, 'identity', 'photo_match', 'Photo matches applicant');

  -- Eligibility checks
  INSERT INTO verification_checklist_items (registration_id, section, check_name, check_label) VALUES
    (NEW.id, 'eligibility', 'age_requirement', 'Meets minimum age requirement'),
    (NEW.id, 'eligibility', 'education_level', 'Education level meets programme prerequisites'),
    (NEW.id, 'eligibility', 'programme_capacity', 'Programme / cohort has capacity'),
    (NEW.id, 'eligibility', 'no_duplicate', 'No duplicate registration found');

  -- Document checks
  INSERT INTO verification_checklist_items (registration_id, section, check_name, check_label) VALUES
    (NEW.id, 'document', 'id_document_uploaded', 'National ID or Passport uploaded'),
    (NEW.id, 'document', 'qualification_uploaded', 'Qualification certificate uploaded'),
    (NEW.id, 'document', 'proof_of_residence', 'Proof of residence uploaded'),
    (NEW.id, 'document', 'documents_legible', 'All documents legible and not expired');

  -- Compliance checks
  INSERT INTO verification_checklist_items (registration_id, section, check_name, check_label) VALUES
    (NEW.id, 'compliance', 'data_consent', 'Data protection consent obtained'),
    (NEW.id, 'compliance', 'terms_accepted', 'Terms and conditions accepted'),
    (NEW.id, 'compliance', 'regulatory_cleared', 'Regulatory body clearance (if applicable)'),
    (NEW.id, 'compliance', 'funding_eligibility', 'Funding eligibility confirmed (if applicable)');

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_generate_checklist
AFTER INSERT ON public.learner_registrations
FOR EACH ROW EXECUTE FUNCTION public.auto_generate_verification_checklist();

-- 6. Add validation metadata to learner_documents
ALTER TABLE public.learner_documents
ADD COLUMN IF NOT EXISTS validation_mode text NOT NULL DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS confidence_score numeric,
ADD COLUMN IF NOT EXISTS validation_status text NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS extracted_data jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS validation_details jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- 7. Document request tracking (closed-loop workflow)
CREATE TABLE public.document_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.learner_registrations(id) ON DELETE CASCADE,
  requested_by uuid,
  document_types text[] NOT NULL DEFAULT '{}',
  message text,
  secure_upload_token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'pending',  -- 'pending', 'partially_fulfilled', 'fulfilled', 'expired'
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  fulfilled_at timestamptz,
  reminder_count integer NOT NULL DEFAULT 0,
  last_reminder_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage document requests"
ON public.document_requests FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'operations'::app_role) OR
  has_role(auth.uid(), 'programme_manager'::app_role) OR
  has_role(auth.uid(), 'facilitator'::app_role) OR
  has_role(auth.uid(), 'assessor'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'operations'::app_role) OR
  has_role(auth.uid(), 'programme_manager'::app_role) OR
  has_role(auth.uid(), 'facilitator'::app_role) OR
  has_role(auth.uid(), 'assessor'::app_role)
);

CREATE TRIGGER update_document_requests_updated_at
BEFORE UPDATE ON public.document_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit document requests
CREATE OR REPLACE FUNCTION public.audit_document_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.onboarding_audit_log (entity_type, entity_id, action, performed_by, details)
  VALUES (
    'document_request',
    NEW.id,
    'documents_requested',
    NEW.requested_by,
    jsonb_build_object(
      'registration_id', NEW.registration_id,
      'document_types', NEW.document_types,
      'message', NEW.message,
      'expires_at', NEW.expires_at
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_document_request
AFTER INSERT ON public.document_requests
FOR EACH ROW EXECUTE FUNCTION public.audit_document_request();

-- 8. Validation mode audit trigger on learner_documents
CREATE OR REPLACE FUNCTION public.audit_validation_mode_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.validation_mode IS DISTINCT FROM NEW.validation_mode THEN
    INSERT INTO public.onboarding_audit_log (entity_type, entity_id, action, performed_by, details)
    VALUES (
      'learner_document',
      NEW.id,
      'validation_mode_changed',
      NEW.verified_by,
      jsonb_build_object(
        'previous_mode', OLD.validation_mode,
        'new_mode', NEW.validation_mode,
        'document_name', NEW.document_name
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_validation_mode
AFTER UPDATE ON public.learner_documents
FOR EACH ROW EXECUTE FUNCTION public.audit_validation_mode_change();

-- 9. Add SLA configuration to platform_settings
INSERT INTO public.platform_settings (setting_key, label, setting_value, setting_type, category, description, is_editable)
VALUES
  ('sla_verification_hours', 'Verification SLA (hours)', '48', 'number', 'onboarding', 'Default SLA hours for verification completion', true),
  ('sla_amber_threshold_percent', 'SLA Amber Warning (%)', '75', 'number', 'onboarding', 'Percentage of SLA elapsed before amber warning', true),
  ('document_validation_mode', 'Document Validation Mode', 'manual', 'select', 'onboarding', 'Default document validation mode: manual or ai_assisted', true),
  ('reminder_intervals_days', 'Reminder Intervals (days)', '1,3,5', 'text', 'onboarding', 'Comma-separated days for automated document reminders', true),
  ('risk_flag_threshold_days', 'Risk Flag Threshold (days)', '7', 'number', 'onboarding', 'Days after which pending documents trigger risk flag', true)
ON CONFLICT (setting_key) DO NOTHING;
