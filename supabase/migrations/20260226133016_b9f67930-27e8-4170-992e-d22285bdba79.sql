
-- Learner Registration Repository (pending approval queue)
CREATE TABLE public.learner_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  date_of_birth DATE,
  address TEXT,
  gender TEXT,
  country TEXT DEFAULT 'South Africa',
  national_id TEXT,
  disability TEXT DEFAULT 'No',
  education_level TEXT,
  programme_id UUID REFERENCES public.programmes(id),
  programme_name TEXT,
  documents JSONB DEFAULT '{}',
  learner_number TEXT,
  registration_method TEXT NOT NULL DEFAULT 'staff-direct',
  status TEXT NOT NULL DEFAULT 'pending_approval',
  rejection_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  registered_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- System settings table for ops control toggles
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.learner_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- RLS for learner_registrations
CREATE POLICY "Admins and ops manage registrations"
ON public.learner_registrations FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'operations') OR 
  has_role(auth.uid(), 'programme_manager')
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'operations') OR 
  has_role(auth.uid(), 'programme_manager')
);

CREATE POLICY "Staff can insert registrations"
ON public.learner_registrations FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'operations') OR 
  has_role(auth.uid(), 'programme_manager') OR
  has_role(auth.uid(), 'facilitator')
);

-- RLS for system_settings
CREATE POLICY "Authenticated can read settings"
ON public.system_settings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins manage settings"
ON public.system_settings FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'operations') OR 
  has_role(auth.uid(), 'systems_admin')
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'operations') OR 
  has_role(auth.uid(), 'systems_admin')
);

-- Trigger for updated_at
CREATE TRIGGER update_learner_registrations_updated_at
BEFORE UPDATE ON public.learner_registrations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default system settings
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
('self_enrollment_enabled', '"false"', 'Allow learners to self-enroll after approval'),
('cohort_assignment_mode', '"automatic"', 'Cohort assignment mode: automatic or manual'),
('re_registration_enabled', '"true"', 'Enable re-registration for courses with re-registration periods');
