DROP POLICY IF EXISTS "Authenticated users read sessions" ON public.training_sessions;

DROP POLICY IF EXISTS "Scoped read on training sessions" ON public.training_sessions;
CREATE POLICY "Scoped read on training sessions"
ON public.training_sessions
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'operations'::app_role)
  OR public.has_role(auth.uid(), 'programme_manager'::app_role)
  OR facilitator_id = auth.uid()
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.enrolments e
    WHERE e.cohort_id = training_sessions.cohort_id
      AND e.learner_id = auth.uid()
  )
);

DROP VIEW IF EXISTS public.training_sessions_safe;
CREATE VIEW public.training_sessions_safe
WITH (security_invoker = true) AS
SELECT
  id, cohort_id, title, description, session_type,
  scheduled_start, scheduled_end, recurrence_rule, recurrence_parent_id,
  jitsi_room_id, meeting_url, status, created_by, facilitator_id,
  max_duration_minutes, recording_url, notes, created_at, updated_at,
  agenda, meeting_config, actual_start, actual_end, tenant_id,
  qr_checkin_enabled
FROM public.training_sessions;

GRANT SELECT ON public.training_sessions_safe TO authenticated;