-- =========================================================
-- 1. cms_pages: filter published-only for general read
-- =========================================================
DROP POLICY IF EXISTS "Anyone can read published pages" ON public.cms_pages;

CREATE POLICY "Authenticated read published pages"
ON public.cms_pages
FOR SELECT
TO authenticated
USING (is_published = true);

-- =========================================================
-- 2. assessment_settings: allow staff who can write to read back
-- =========================================================
CREATE POLICY "Staff can read assessment_settings"
ON public.assessment_settings
FOR SELECT
TO authenticated
USING (
  is_platform_admin(auth.uid())
  OR has_role(auth.uid(), 'programme_manager'::app_role)
  OR has_role(auth.uid(), 'facilitator'::app_role)
);

-- =========================================================
-- 3. learner_registrations: PoPIA self-read for the learner
-- =========================================================
CREATE POLICY "Learners can read own registration"
ON public.learner_registrations
FOR SELECT
TO authenticated
USING (user_id = auth.uid());