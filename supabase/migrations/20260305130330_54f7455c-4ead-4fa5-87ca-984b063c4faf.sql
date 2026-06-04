
-- Table for multi-role assignments per staff registration
CREATE TABLE public.staff_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_registration_id UUID NOT NULL REFERENCES public.staff_registrations(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(staff_registration_id, role_name)
);

-- Enable RLS
ALTER TABLE public.staff_role_assignments ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users with staff management roles can read/write
CREATE POLICY "Authenticated users can read staff role assignments"
  ON public.staff_role_assignments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff managers can insert role assignments"
  ON public.staff_role_assignments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Staff managers can update role assignments"
  ON public.staff_role_assignments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Staff managers can delete role assignments"
  ON public.staff_role_assignments FOR DELETE TO authenticated USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_staff_role_assignments_updated_at
  BEFORE UPDATE ON public.staff_role_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
