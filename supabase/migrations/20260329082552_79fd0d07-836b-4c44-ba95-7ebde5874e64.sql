
-- 1. moderation_items: scope INSERT to ensure submitted_by matches the caller
DROP POLICY IF EXISTS "Authenticated users can flag content" ON public.moderation_items;

CREATE POLICY "Authenticated users can flag content"
ON public.moderation_items FOR INSERT
TO authenticated
WITH CHECK (submitted_by = auth.uid());

-- 2. learning_recommendations: restrict INSERT to admin/staff roles
DROP POLICY IF EXISTS "System can create recommendations" ON public.learning_recommendations;

CREATE POLICY "Staff can create recommendations"
ON public.learning_recommendations FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'systems_admin'::app_role)
  OR has_role(auth.uid(), 'facilitator'::app_role)
  OR has_role(auth.uid(), 'programme_manager'::app_role)
);
