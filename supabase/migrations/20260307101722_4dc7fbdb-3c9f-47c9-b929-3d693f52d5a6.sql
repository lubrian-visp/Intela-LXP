
-- Table to track staff assigned to cohorts by role
CREATE TABLE public.cohort_staff_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('facilitator', 'assessor', 'moderator', 'mentor')),
  assigned_by UUID,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cohort_id, user_id, role)
);

-- RLS
ALTER TABLE public.cohort_staff_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cohort staff assignments"
  ON public.cohort_staff_assignments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert cohort staff assignments"
  ON public.cohort_staff_assignments FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete cohort staff assignments"
  ON public.cohort_staff_assignments FOR DELETE TO authenticated
  USING (true);
