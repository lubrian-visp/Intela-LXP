
-- Add user_id column to learner_registrations to track provisioned auth user
ALTER TABLE public.learner_registrations ADD COLUMN IF NOT EXISTS user_id uuid;

-- Fix existing data by matching registration names to profiles
UPDATE public.learner_registrations lr
SET user_id = p.user_id
FROM public.profiles p
WHERE LOWER(p.full_name) = LOWER(lr.full_name)
  AND lr.user_id IS NULL;
