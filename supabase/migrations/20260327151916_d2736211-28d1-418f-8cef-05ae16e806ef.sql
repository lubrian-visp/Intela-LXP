
-- ============================================
-- WBT Phase 1: Core Tables for Agile Work-Based Training
-- ============================================

-- 1. WBT Projects (core marketplace entity)
CREATE TABLE public.wbt_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id uuid REFERENCES public.programmes(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  required_skills text[] DEFAULT '{}',
  agile_framework text NOT NULL DEFAULT 'scrum',
  sprint_length_weeks integer DEFAULT 2,
  project_model text NOT NULL DEFAULT 'external_client',
  payment_model text NOT NULL DEFAULT 'unpaid',
  budget numeric DEFAULT 0,
  currency text DEFAULT 'ZAR',
  status text NOT NULL DEFAULT 'draft',
  created_by uuid NOT NULL,
  mentor_id uuid,
  client_id uuid,
  max_learners integer DEFAULT 1,
  start_date date,
  end_date date,
  config_json jsonb DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. WBT Backlog Items (user stories)
CREATE TABLE public.wbt_backlog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.wbt_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  acceptance_criteria text,
  story_points integer,
  priority integer DEFAULT 0,
  status text NOT NULL DEFAULT 'backlog',
  created_by uuid NOT NULL,
  approved_by uuid,
  sprint_id uuid,
  sequence_order integer DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. WBT Sprints
CREATE TABLE public.wbt_sprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.wbt_projects(id) ON DELETE CASCADE,
  sprint_number integer NOT NULL DEFAULT 1,
  title text,
  goal text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'planning',
  review_status text DEFAULT 'pending',
  reviewed_by uuid,
  second_reviewer_id uuid,
  second_review_status text,
  payment_released boolean DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- FK from backlog items to sprints (now that sprints exist)
ALTER TABLE public.wbt_backlog_items
  ADD CONSTRAINT wbt_backlog_items_sprint_id_fkey
  FOREIGN KEY (sprint_id) REFERENCES public.wbt_sprints(id) ON DELETE SET NULL;

-- 4. WBT Board Columns (dynamic, admin-configurable)
CREATE TABLE public.wbt_board_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.wbt_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  column_key text NOT NULL,
  sequence_order integer DEFAULT 0,
  is_mentor_review boolean DEFAULT false,
  is_done boolean DEFAULT false,
  color text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. WBT Board Cards (tasks on the board)
CREATE TABLE public.wbt_board_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.wbt_projects(id) ON DELETE CASCADE,
  backlog_item_id uuid REFERENCES public.wbt_backlog_items(id) ON DELETE CASCADE,
  column_id uuid NOT NULL REFERENCES public.wbt_board_columns(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assigned_to uuid,
  priority text DEFAULT 'medium',
  sequence_order integer DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. WBT Mentor Notes (private workspace)
CREATE TABLE public.wbt_mentor_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.wbt_projects(id) ON DELETE CASCADE,
  mentor_id uuid NOT NULL,
  learner_id uuid,
  note_type text DEFAULT 'general',
  content text NOT NULL,
  is_private boolean DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. WBT Project Applications (learner marketplace applications)
CREATE TABLE public.wbt_project_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.wbt_projects(id) ON DELETE CASCADE,
  learner_id uuid NOT NULL,
  cover_note text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, learner_id)
);

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE public.wbt_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wbt_backlog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wbt_sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wbt_board_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wbt_board_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wbt_mentor_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wbt_project_applications ENABLE ROW LEVEL SECURITY;

-- WBT Projects: authenticated can read published, creators/mentors/clients can manage
CREATE POLICY "Anyone can read published projects"
  ON public.wbt_projects FOR SELECT TO authenticated
  USING (status IN ('published', 'active', 'in_progress', 'completed') OR created_by = auth.uid() OR mentor_id = auth.uid() OR client_id = auth.uid());

CREATE POLICY "Creators can insert projects"
  ON public.wbt_projects FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Owners and mentors can update projects"
  ON public.wbt_projects FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR mentor_id = auth.uid() OR client_id = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Admins can delete projects"
  ON public.wbt_projects FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_platform_admin(auth.uid()));

-- Backlog Items: project participants can read, creators/mentors/clients can manage
CREATE POLICY "Project participants can read backlog"
  ON public.wbt_backlog_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.wbt_projects p
    WHERE p.id = project_id AND (p.created_by = auth.uid() OR p.mentor_id = auth.uid() OR p.client_id = auth.uid() OR public.is_platform_admin(auth.uid())
      OR EXISTS (SELECT 1 FROM public.wbt_project_applications a WHERE a.project_id = p.id AND a.learner_id = auth.uid() AND a.status = 'accepted'))
  ));

CREATE POLICY "Participants can insert backlog items"
  ON public.wbt_backlog_items FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Participants can update backlog items"
  ON public.wbt_backlog_items FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM public.wbt_projects p WHERE p.id = project_id AND (p.mentor_id = auth.uid() OR p.client_id = auth.uid() OR public.is_platform_admin(auth.uid()))
  ));

CREATE POLICY "Owners can delete backlog items"
  ON public.wbt_backlog_items FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM public.wbt_projects p WHERE p.id = project_id AND (p.mentor_id = auth.uid() OR p.client_id = auth.uid() OR public.is_platform_admin(auth.uid()))
  ));

-- Sprints: same visibility as backlog
CREATE POLICY "Project participants can read sprints"
  ON public.wbt_sprints FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.wbt_projects p
    WHERE p.id = project_id AND (p.created_by = auth.uid() OR p.mentor_id = auth.uid() OR p.client_id = auth.uid() OR public.is_platform_admin(auth.uid())
      OR EXISTS (SELECT 1 FROM public.wbt_project_applications a WHERE a.project_id = p.id AND a.learner_id = auth.uid() AND a.status = 'accepted'))
  ));

CREATE POLICY "Mentors and clients can manage sprints"
  ON public.wbt_sprints FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.wbt_projects p WHERE p.id = project_id AND (p.mentor_id = auth.uid() OR p.client_id = auth.uid() OR p.created_by = auth.uid() OR public.is_platform_admin(auth.uid()))
  ));

CREATE POLICY "Mentors and clients can update sprints"
  ON public.wbt_sprints FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.wbt_projects p WHERE p.id = project_id AND (p.mentor_id = auth.uid() OR p.client_id = auth.uid() OR public.is_platform_admin(auth.uid()))
  ));

-- Board Columns: project participants can read, admins/mentors can manage
CREATE POLICY "Participants can read board columns"
  ON public.wbt_board_columns FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.wbt_projects p
    WHERE p.id = project_id AND (p.created_by = auth.uid() OR p.mentor_id = auth.uid() OR p.client_id = auth.uid() OR public.is_platform_admin(auth.uid())
      OR EXISTS (SELECT 1 FROM public.wbt_project_applications a WHERE a.project_id = p.id AND a.learner_id = auth.uid() AND a.status = 'accepted'))
  ));

CREATE POLICY "Admins can manage board columns"
  ON public.wbt_board_columns FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.wbt_projects p WHERE p.id = project_id AND (p.mentor_id = auth.uid() OR p.created_by = auth.uid() OR public.is_platform_admin(auth.uid()))
  ));

-- Board Cards: participants can read/manage
CREATE POLICY "Participants can read board cards"
  ON public.wbt_board_cards FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.wbt_projects p
    WHERE p.id = project_id AND (p.created_by = auth.uid() OR p.mentor_id = auth.uid() OR p.client_id = auth.uid() OR public.is_platform_admin(auth.uid())
      OR EXISTS (SELECT 1 FROM public.wbt_project_applications a WHERE a.project_id = p.id AND a.learner_id = auth.uid() AND a.status = 'accepted'))
  ));

CREATE POLICY "Participants can manage board cards"
  ON public.wbt_board_cards FOR ALL TO authenticated
  USING (assigned_to = auth.uid() OR EXISTS (
    SELECT 1 FROM public.wbt_projects p WHERE p.id = project_id AND (p.mentor_id = auth.uid() OR p.created_by = auth.uid() OR public.is_platform_admin(auth.uid()))
  ));

-- Mentor Notes: mentor + admin only
CREATE POLICY "Mentors can read own notes"
  ON public.wbt_mentor_notes FOR SELECT TO authenticated
  USING (mentor_id = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Mentors can insert notes"
  ON public.wbt_mentor_notes FOR INSERT TO authenticated
  WITH CHECK (mentor_id = auth.uid());

CREATE POLICY "Mentors can update own notes"
  ON public.wbt_mentor_notes FOR UPDATE TO authenticated
  USING (mentor_id = auth.uid());

CREATE POLICY "Mentors can delete own notes"
  ON public.wbt_mentor_notes FOR DELETE TO authenticated
  USING (mentor_id = auth.uid());

-- Project Applications: learners can apply, project owners can manage
CREATE POLICY "Learners can read own applications"
  ON public.wbt_project_applications FOR SELECT TO authenticated
  USING (learner_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.wbt_projects p WHERE p.id = project_id AND (p.created_by = auth.uid() OR p.mentor_id = auth.uid() OR p.client_id = auth.uid() OR public.is_platform_admin(auth.uid()))
  ));

CREATE POLICY "Learners can apply to projects"
  ON public.wbt_project_applications FOR INSERT TO authenticated
  WITH CHECK (learner_id = auth.uid());

CREATE POLICY "Project owners can update applications"
  ON public.wbt_project_applications FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.wbt_projects p WHERE p.id = project_id AND (p.created_by = auth.uid() OR p.mentor_id = auth.uid() OR p.client_id = auth.uid() OR public.is_platform_admin(auth.uid()))
  ));

-- ============================================
-- Enable Realtime for board cards (live board updates)
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.wbt_board_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wbt_backlog_items;

-- ============================================
-- Auto-create default board columns trigger
-- ============================================
CREATE OR REPLACE FUNCTION public.wbt_auto_create_board_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.wbt_board_columns (project_id, title, column_key, sequence_order, is_done) VALUES
    (NEW.id, 'To Do', 'todo', 0, false),
    (NEW.id, 'In Progress', 'in_progress', 1, false),
    (NEW.id, 'Review', 'review', 2, false),
    (NEW.id, 'Done', 'done', 3, true);
  RETURN NEW;
END;
$$;

CREATE TRIGGER wbt_projects_auto_columns
  AFTER INSERT ON public.wbt_projects
  FOR EACH ROW EXECUTE FUNCTION public.wbt_auto_create_board_columns();

-- ============================================
-- Updated_at triggers
-- ============================================
CREATE TRIGGER wbt_projects_updated_at BEFORE UPDATE ON public.wbt_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER wbt_backlog_items_updated_at BEFORE UPDATE ON public.wbt_backlog_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER wbt_sprints_updated_at BEFORE UPDATE ON public.wbt_sprints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER wbt_board_cards_updated_at BEFORE UPDATE ON public.wbt_board_cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER wbt_mentor_notes_updated_at BEFORE UPDATE ON public.wbt_mentor_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER wbt_project_applications_updated_at BEFORE UPDATE ON public.wbt_project_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
