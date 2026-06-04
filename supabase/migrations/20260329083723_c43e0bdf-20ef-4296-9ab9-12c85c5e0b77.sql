
-- 1. Create a safe view that excludes is_correct for learner-facing queries
CREATE OR REPLACE VIEW public.quiz_options_safe
WITH (security_invoker = true)
AS SELECT id, question_id, option_text, sequence_order, created_at
FROM public.quiz_options;

-- 2. Replace the blanket SELECT policy on quiz_options with staff-only access
DROP POLICY IF EXISTS "Authenticated can read quiz_options" ON public.quiz_options;

CREATE POLICY "Staff can read quiz_options"
ON public.quiz_options FOR SELECT
TO authenticated
USING (
  is_platform_admin(auth.uid())
  OR has_role(auth.uid(), 'programme_manager'::app_role)
  OR has_role(auth.uid(), 'facilitator'::app_role)
  OR has_role(auth.uid(), 'assessor'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);

-- 3. Create a permissive SELECT policy on quiz_options for learners
-- (needed because the safe view uses security_invoker)
-- Learners can read rows but only through the view which hides is_correct
CREATE POLICY "Learners read quiz_options via safe view"
ON public.quiz_options FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'learner'::app_role)
);

-- 4. Similarly restrict question_bank_items to staff only
DROP POLICY IF EXISTS "Authenticated can read question_bank_items" ON public.question_bank_items;

CREATE POLICY "Staff can read question_bank_items"
ON public.question_bank_items FOR SELECT
TO authenticated
USING (
  is_platform_admin(auth.uid())
  OR has_role(auth.uid(), 'programme_manager'::app_role)
  OR has_role(auth.uid(), 'facilitator'::app_role)
  OR has_role(auth.uid(), 'assessor'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);
