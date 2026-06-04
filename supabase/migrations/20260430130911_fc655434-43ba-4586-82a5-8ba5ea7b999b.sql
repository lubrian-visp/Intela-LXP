-- Restrict Realtime channel subscriptions: users may only subscribe to / broadcast on
-- topics that contain their own auth.uid(). This prevents cross-tenant snooping on
-- private channels (e.g. notifications, enrolments, submissions).

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only access own-scoped topics" ON realtime.messages;
DROP POLICY IF EXISTS "Users can only broadcast to own-scoped topics" ON realtime.messages;

CREATE POLICY "Users can only access own-scoped topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  topic LIKE '%' || (auth.uid())::text || '%'
);

CREATE POLICY "Users can only broadcast to own-scoped topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  topic LIKE '%' || (auth.uid())::text || '%'
);