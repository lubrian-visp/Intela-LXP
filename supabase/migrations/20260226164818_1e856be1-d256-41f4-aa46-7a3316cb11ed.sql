
-- =============================================
-- COLLABORATION TABLES
-- =============================================

-- 1. In-session chat messages
CREATE TABLE public.session_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  message text NOT NULL,
  message_type text NOT NULL DEFAULT 'text', -- text, system, file
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.session_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read session chat" ON public.session_chat_messages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated insert session chat" ON public.session_chat_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins delete session chat" ON public.session_chat_messages
  FOR DELETE TO authenticated USING (
    has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'facilitator')
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_chat_messages;

-- 2. Discussion threads (per programme or cohort)
CREATE TABLE public.discussion_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  scope_type text NOT NULL DEFAULT 'programme', -- programme, cohort
  scope_id uuid NOT NULL,
  author_id uuid NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  is_locked boolean NOT NULL DEFAULT false,
  reply_count integer NOT NULL DEFAULT 0,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.discussion_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read threads" ON public.discussion_threads
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated create threads" ON public.discussion_threads
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors update own threads" ON public.discussion_threads
  FOR UPDATE TO authenticated USING (author_id = auth.uid());

CREATE POLICY "Staff manage threads" ON public.discussion_threads
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'programme_manager') OR has_role(auth.uid(), 'facilitator'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'programme_manager') OR has_role(auth.uid(), 'facilitator'));

-- 3. Discussion posts (replies)
CREATE TABLE public.discussion_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.discussion_threads(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL,
  parent_post_id uuid REFERENCES public.discussion_posts(id) ON DELETE SET NULL,
  is_solution boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.discussion_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read posts" ON public.discussion_posts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated create posts" ON public.discussion_posts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors update own posts" ON public.discussion_posts
  FOR UPDATE TO authenticated USING (author_id = auth.uid());

CREATE POLICY "Staff manage posts" ON public.discussion_posts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'programme_manager') OR has_role(auth.uid(), 'facilitator'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'programme_manager') OR has_role(auth.uid(), 'facilitator'));

-- Trigger to update reply_count and last_activity_at
CREATE OR REPLACE FUNCTION public.update_thread_on_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE discussion_threads SET reply_count = reply_count + 1, last_activity_at = now(), updated_at = now() WHERE id = NEW.thread_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE discussion_threads SET reply_count = GREATEST(reply_count - 1, 0), updated_at = now() WHERE id = OLD.thread_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_update_thread_on_post
AFTER INSERT OR DELETE ON public.discussion_posts
FOR EACH ROW EXECUTE FUNCTION public.update_thread_on_post();

-- Enable realtime for discussions
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussion_posts;

-- 4. Announcements
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  priority text NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
  scope_type text NOT NULL DEFAULT 'global', -- global, programme, cohort
  scope_id uuid,
  author_id uuid NOT NULL,
  published_at timestamptz,
  expires_at timestamptz,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read published announcements" ON public.announcements
  FOR SELECT TO authenticated USING (is_published = true);

CREATE POLICY "Staff manage announcements" ON public.announcements
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'programme_manager') OR has_role(auth.uid(), 'facilitator') OR has_role(auth.uid(), 'operations'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'programme_manager') OR has_role(auth.uid(), 'facilitator') OR has_role(auth.uid(), 'operations'));

-- 5. Announcement read receipts
CREATE TABLE public.announcement_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own receipts" ON public.announcement_reads
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users insert own receipts" ON public.announcement_reads
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Staff read all receipts" ON public.announcement_reads
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'programme_manager') OR has_role(auth.uid(), 'facilitator'));

-- 6. Shared session notes (collaborative)
CREATE TABLE public.session_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  note_type text NOT NULL DEFAULT 'note', -- note, action_item, key_point
  is_shared boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read shared notes" ON public.session_notes
  FOR SELECT TO authenticated USING (is_shared = true OR author_id = auth.uid());

CREATE POLICY "Authenticated create notes" ON public.session_notes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors update own notes" ON public.session_notes
  FOR UPDATE TO authenticated USING (author_id = auth.uid());

CREATE POLICY "Authors delete own notes" ON public.session_notes
  FOR DELETE TO authenticated USING (author_id = auth.uid());

CREATE POLICY "Staff manage all notes" ON public.session_notes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'facilitator'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'facilitator'));

-- Enable realtime for session notes
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_notes;

-- Indexes for performance
CREATE INDEX idx_session_chat_session ON public.session_chat_messages(session_id, created_at);
CREATE INDEX idx_discussion_threads_scope ON public.discussion_threads(scope_type, scope_id);
CREATE INDEX idx_discussion_posts_thread ON public.discussion_posts(thread_id, created_at);
CREATE INDEX idx_announcements_scope ON public.announcements(scope_type, scope_id, is_published);
CREATE INDEX idx_announcement_reads_user ON public.announcement_reads(user_id, announcement_id);
CREATE INDEX idx_session_notes_session ON public.session_notes(session_id);
