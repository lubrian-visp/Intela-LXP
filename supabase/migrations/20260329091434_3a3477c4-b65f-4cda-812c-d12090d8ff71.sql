-- Drop the learner policy on the BASE quiz_options table that leaks is_correct
DROP POLICY IF EXISTS "Learners read quiz_options via safe view" ON public.quiz_options;