
-- Drop existing FK on enrolments.cohort_id and recreate with ON DELETE SET NULL
ALTER TABLE public.enrolments
  DROP CONSTRAINT IF EXISTS enrolments_cohort_id_fkey;

ALTER TABLE public.enrolments
  ADD CONSTRAINT enrolments_cohort_id_fkey
  FOREIGN KEY (cohort_id) REFERENCES public.cohorts(id)
  ON DELETE SET NULL;

-- Make cohort_id nullable to support SET NULL behaviour
ALTER TABLE public.enrolments
  ALTER COLUMN cohort_id DROP NOT NULL;

-- Explicitly confirm RESTRICT on cohorts.programme_id (drop and re-add)
ALTER TABLE public.cohorts
  DROP CONSTRAINT IF EXISTS cohorts_programme_id_fkey;

ALTER TABLE public.cohorts
  ADD CONSTRAINT cohorts_programme_id_fkey
  FOREIGN KEY (programme_id) REFERENCES public.programmes(id)
  ON DELETE RESTRICT;
