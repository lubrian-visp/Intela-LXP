
-- Staff registrations table for staff onboarding workflow
CREATE TABLE public.staff_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role_requested TEXT NOT NULL,
  department TEXT,
  status TEXT NOT NULL DEFAULT 'pending_verification',
  documents JSONB DEFAULT '{}'::jsonb,
  document_verification_status TEXT NOT NULL DEFAULT 'pending',
  document_verified_by UUID,
  document_verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  registered_by UUID,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  portal_access_granted BOOLEAN DEFAULT false,
  credentials_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit log table for onboarding events
CREATE TABLE public.onboarding_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'learner' or 'staff'
  entity_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'registered', 'approved', 'rejected', 'documents_verified', 'portal_access_granted', 'enrolled', 'cohort_assigned'
  performed_by UUID,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_audit_log ENABLE ROW LEVEL SECURITY;

-- Staff registrations policies
CREATE POLICY "Admins and ops manage staff registrations"
  ON public.staff_registrations FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role));

CREATE POLICY "Programme managers can view staff registrations"
  ON public.staff_registrations FOR SELECT
  USING (has_role(auth.uid(), 'programme_manager'::app_role));

-- Audit log policies
CREATE POLICY "Admins and ops can read audit log"
  ON public.onboarding_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role) OR has_role(auth.uid(), 'talent_manager'::app_role));

CREATE POLICY "System can insert audit log"
  ON public.onboarding_audit_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Triggers for updated_at
CREATE TRIGGER update_staff_registrations_updated_at
  BEFORE UPDATE ON public.staff_registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
