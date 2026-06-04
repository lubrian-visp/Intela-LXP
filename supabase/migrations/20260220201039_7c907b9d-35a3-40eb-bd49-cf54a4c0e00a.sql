
-- Training sessions table
CREATE TABLE public.training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  session_type text NOT NULL DEFAULT 'live', -- live, recorded, hybrid
  scheduled_start timestamp with time zone NOT NULL,
  scheduled_end timestamp with time zone NOT NULL,
  recurrence_rule text, -- e.g. 'WEEKLY:MON,WED' or null for one-off
  recurrence_parent_id uuid REFERENCES public.training_sessions(id),
  jitsi_room_id text NOT NULL DEFAULT gen_random_uuid()::text,
  meeting_url text, -- generated jitsi URL
  status text NOT NULL DEFAULT 'scheduled', -- scheduled, live, completed, cancelled
  created_by uuid NOT NULL,
  facilitator_id uuid,
  max_duration_minutes integer DEFAULT 60,
  recording_url text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Session attendance table
CREATE TABLE public.session_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  learner_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'absent', -- present, absent, late, excused
  check_in_method text, -- self, facilitator, automatic
  checked_in_at timestamp with time zone,
  checked_out_at timestamp with time zone,
  duration_minutes integer,
  notes text,
  marked_by uuid, -- facilitator who marked attendance (null for self check-in)
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(session_id, learner_id)
);

-- Enable RLS
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_attendance ENABLE ROW LEVEL SECURITY;

-- Training sessions policies
CREATE POLICY "Admins manage all sessions"
ON public.training_sessions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role));

CREATE POLICY "Facilitators manage own sessions"
ON public.training_sessions FOR ALL TO authenticated
USING (facilitator_id = auth.uid() OR created_by = auth.uid())
WITH CHECK (facilitator_id = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Authenticated users read sessions"
ON public.training_sessions FOR SELECT TO authenticated
USING (true);

-- Session attendance policies
CREATE POLICY "Admins manage all attendance"
ON public.session_attendance FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role));

CREATE POLICY "Learners self check-in"
ON public.session_attendance FOR INSERT TO authenticated
WITH CHECK (learner_id = auth.uid());

CREATE POLICY "Learners update own attendance"
ON public.session_attendance FOR UPDATE TO authenticated
USING (learner_id = auth.uid());

CREATE POLICY "Learners view own attendance"
ON public.session_attendance FOR SELECT TO authenticated
USING (learner_id = auth.uid());

-- Triggers
CREATE TRIGGER update_training_sessions_updated_at
BEFORE UPDATE ON public.training_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_session_attendance_updated_at
BEFORE UPDATE ON public.session_attendance
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.training_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_attendance;
