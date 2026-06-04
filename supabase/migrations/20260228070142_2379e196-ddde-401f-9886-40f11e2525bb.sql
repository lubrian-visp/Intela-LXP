-- Drop the outdated check constraint and replace with one that includes all lifecycle statuses
ALTER TABLE public.programmes DROP CONSTRAINT programmes_status_check;

ALTER TABLE public.programmes ADD CONSTRAINT programmes_status_check
  CHECK (status = ANY (ARRAY[
    'draft'::text,
    'submitted'::text,
    'pending_approval'::text,
    'approved'::text,
    'rejected'::text,
    'published'::text,
    'suspended'::text,
    'archived'::text,
    'active'::text
  ]));