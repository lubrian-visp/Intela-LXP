
-- Fix shared_content_versions: scope INSERT to the author (changed_by column)
DROP POLICY IF EXISTS "Authors can insert shared content versions" ON public.shared_content_versions;

CREATE POLICY "Authors can insert shared content versions"
ON public.shared_content_versions FOR INSERT
TO authenticated
WITH CHECK (changed_by = auth.uid());
