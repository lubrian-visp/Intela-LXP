
-- Add agenda and meeting config columns to training_sessions
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS agenda jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS meeting_config jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS actual_start timestamp with time zone,
  ADD COLUMN IF NOT EXISTS actual_end timestamp with time zone;

-- Add meeting_reactions table for Teams-like reactions during sessions
CREATE TABLE IF NOT EXISTS public.meeting_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction_type text NOT NULL DEFAULT 'like',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add meeting_participants table to track join/leave and hand raises
CREATE TABLE IF NOT EXISTS public.meeting_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text,
  role text NOT NULL DEFAULT 'attendee',
  is_hand_raised boolean NOT NULL DEFAULT false,
  is_muted boolean NOT NULL DEFAULT false,
  is_video_on boolean NOT NULL DEFAULT true,
  is_screen_sharing boolean NOT NULL DEFAULT false,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  left_at timestamp with time zone,
  status text NOT NULL DEFAULT 'in_lobby',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

-- Enable RLS
ALTER TABLE public.meeting_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;

-- RLS for meeting_reactions
CREATE POLICY "Authenticated read session reactions"
  ON public.meeting_reactions FOR SELECT
  USING (true);

CREATE POLICY "Users insert own reactions"
  ON public.meeting_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own reactions"
  ON public.meeting_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS for meeting_participants
CREATE POLICY "Authenticated read session participants"
  ON public.meeting_participants FOR SELECT
  USING (true);

CREATE POLICY "Users manage own participation"
  ON public.meeting_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own participation"
  ON public.meeting_participants FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Facilitators manage all participants"
  ON public.meeting_participants FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'programme_manager'::app_role) OR 
    has_role(auth.uid(), 'facilitator'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'programme_manager'::app_role) OR 
    has_role(auth.uid(), 'facilitator'::app_role)
  );

-- Enable realtime for meeting features
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_participants;

-- Updated_at trigger for meeting_participants
CREATE TRIGGER update_meeting_participants_updated_at
  BEFORE UPDATE ON public.meeting_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
