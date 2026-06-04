-- Drop the insecure substring-match policies on realtime.messages
DROP POLICY IF EXISTS "Users can only access own-scoped topics" ON realtime.messages;
DROP POLICY IF EXISTS "Users can only broadcast to own-scoped topics" ON realtime.messages;

-- Recreate with strict prefix matching: exact uid match, or uid followed by ':'
CREATE POLICY "Users can only access own-scoped topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  topic = (auth.uid())::text
  OR topic LIKE ((auth.uid())::text || ':%')
);

CREATE POLICY "Users can only broadcast to own-scoped topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  topic = (auth.uid())::text
  OR topic LIKE ((auth.uid())::text || ':%')
);