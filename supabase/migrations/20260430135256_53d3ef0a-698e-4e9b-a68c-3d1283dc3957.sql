-- Restrict content_blocks SELECT to authenticated users only (was {public})
DROP POLICY IF EXISTS "Authenticated read content blocks" ON public.content_blocks;

CREATE POLICY "Authenticated read content blocks"
ON public.content_blocks
FOR SELECT
TO authenticated
USING (true);