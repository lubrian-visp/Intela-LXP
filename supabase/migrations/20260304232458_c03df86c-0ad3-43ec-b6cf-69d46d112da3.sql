
-- Fix existing enrolments: replace registration IDs with auth user IDs
UPDATE public.enrolments e
SET learner_id = lr.user_id
FROM public.learner_registrations lr
WHERE e.learner_id = lr.id
  AND lr.user_id IS NOT NULL
  AND e.learner_id != lr.user_id;
