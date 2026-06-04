
-- Phase 3: WBT Intelligence & Analytics

-- 1. Mentor skills/capacity table for auto-assignment
CREATE TABLE public.wbt_mentor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  skills text[] DEFAULT '{}',
  max_concurrent_projects integer DEFAULT 3,
  is_available boolean DEFAULT true,
  rating_average numeric DEFAULT 0,
  total_projects_completed integer DEFAULT 0,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.wbt_mentor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view mentor profiles" ON public.wbt_mentor_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Mentors can update own profile" ON public.wbt_mentor_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage mentor profiles" ON public.wbt_mentor_profiles FOR ALL TO authenticated USING (public.is_platform_admin(auth.uid()));

-- 2. WBT completion credentials link table
CREATE TABLE public.wbt_project_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.wbt_projects(id) ON DELETE CASCADE,
  learner_id uuid NOT NULL,
  credential_id uuid REFERENCES public.issued_credentials(id) ON DELETE SET NULL,
  completion_date timestamptz DEFAULT now(),
  hours_logged numeric DEFAULT 0,
  mentor_endorsement text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, learner_id)
);

ALTER TABLE public.wbt_project_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own WBT credentials" ON public.wbt_project_credentials FOR SELECT TO authenticated USING (learner_id = auth.uid());
CREATE POLICY "Admins can manage WBT credentials" ON public.wbt_project_credentials FOR ALL TO authenticated USING (public.is_platform_admin(auth.uid()));
CREATE POLICY "Mentors can insert WBT credentials" ON public.wbt_project_credentials FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.wbt_projects WHERE id = project_id AND mentor_id = auth.uid())
);

-- 3. Feature flag for mentor review column per project
ALTER TABLE public.wbt_projects ADD COLUMN IF NOT EXISTS enable_mentor_review_column boolean DEFAULT false;

-- 4. Notification triggers for WBT events

-- 4a. Notify project owner when a learner applies
CREATE OR REPLACE FUNCTION public.wbt_notify_application_received()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  _project record;
  _notify_user uuid;
BEGIN
  SELECT * INTO _project FROM wbt_projects WHERE id = NEW.project_id;
  _notify_user := COALESCE(_project.client_id, _project.mentor_id, _project.created_by);
  IF _notify_user IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, body, category, reference_table, reference_id, action_url)
    VALUES (_notify_user, 'New WBT Application', 'A learner has applied to project "' || _project.title || '".', 'general', 'wbt_project_applications', NEW.id, '/wbt/project/' || NEW.project_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER wbt_on_application_received
  AFTER INSERT ON public.wbt_project_applications
  FOR EACH ROW EXECUTE FUNCTION public.wbt_notify_application_received();

-- 4b. Notify learners when sprint is accepted
CREATE OR REPLACE FUNCTION public.wbt_notify_sprint_accepted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF OLD.decision IS DISTINCT FROM NEW.decision AND NEW.decision = 'accepted' THEN
    -- Notify all accepted learners on the project
    INSERT INTO notifications (user_id, title, body, category, reference_table, reference_id, action_url)
    SELECT pa.learner_id, 'Sprint Accepted', 'Sprint ' || COALESCE(NEW.sprint_number::text, '') || ' has been accepted on your project.', 'general', 'wbt_sprint_reviews', NEW.id, '/wbt/project/' || NEW.project_id
    FROM wbt_project_applications pa
    WHERE pa.project_id = NEW.project_id AND pa.status = 'accepted';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER wbt_on_sprint_accepted
  AFTER UPDATE ON public.wbt_sprint_reviews
  FOR EACH ROW EXECUTE FUNCTION public.wbt_notify_sprint_accepted();

-- 4c. Notify on escrow payment release
CREATE OR REPLACE FUNCTION public.wbt_notify_payment_released()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  _project record;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'released' THEN
    SELECT * INTO _project FROM wbt_projects WHERE id = NEW.project_id;
    -- Notify mentor
    IF _project.mentor_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, body, category, reference_table, reference_id, action_url)
      VALUES (_project.mentor_id, 'Payment Released', 'Payment of ' || NEW.currency || ' ' || NEW.net_amount || ' has been released for project "' || _project.title || '".', 'general', 'wbt_escrow_transactions', NEW.id, '/wbt/project/' || NEW.project_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER wbt_on_payment_released
  AFTER UPDATE ON public.wbt_escrow_transactions
  FOR EACH ROW EXECUTE FUNCTION public.wbt_notify_payment_released();

-- 5. Mentor auto-assignment function
CREATE OR REPLACE FUNCTION public.wbt_suggest_mentors(
  _project_id uuid,
  _limit integer DEFAULT 5
)
RETURNS TABLE(user_id uuid, match_score numeric, skills text[], current_projects bigint, rating_average numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  _required_skills text[];
BEGIN
  SELECT required_skills INTO _required_skills FROM wbt_projects WHERE id = _project_id;

  RETURN QUERY
  SELECT
    mp.user_id,
    -- Score: skill overlap + rating + availability
    (
      COALESCE(array_length(ARRAY(SELECT unnest(mp.skills) INTERSECT SELECT unnest(_required_skills)), 1), 0)::numeric * 10
      + COALESCE(mp.rating_average, 0) * 2
      - COALESCE(active.cnt, 0) * 5
    ) AS match_score,
    mp.skills,
    COALESCE(active.cnt, 0) AS current_projects,
    mp.rating_average
  FROM wbt_mentor_profiles mp
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS cnt FROM wbt_projects wp
    WHERE wp.mentor_id = mp.user_id AND wp.status IN ('published', 'in_progress')
  ) active ON true
  WHERE mp.is_available = true
    AND COALESCE(active.cnt, 0) < mp.max_concurrent_projects
  ORDER BY match_score DESC
  LIMIT _limit;
END;
$$;

-- 6. Auto-credential on project completion
CREATE OR REPLACE FUNCTION public.wbt_auto_credential_on_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  _app record;
  _cred_id uuid;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' THEN
    FOR _app IN SELECT * FROM wbt_project_applications WHERE project_id = NEW.id AND status = 'accepted' LOOP
      -- Check if credential already exists
      IF NOT EXISTS (SELECT 1 FROM wbt_project_credentials WHERE project_id = NEW.id AND learner_id = _app.learner_id) THEN
        -- Issue credential
        INSERT INTO issued_credentials (learner_id, programme_id, title, credential_type, status, issued_at, issued_by)
        VALUES (_app.learner_id, NEW.programme_id, NEW.title || ' - WBT Completion', 'certificate', 'active', now(), auth.uid())
        RETURNING id INTO _cred_id;

        -- Link to WBT
        INSERT INTO wbt_project_credentials (project_id, learner_id, credential_id)
        VALUES (NEW.id, _app.learner_id, _cred_id);

        -- Notify learner
        INSERT INTO notifications (user_id, title, body, category, action_url)
        VALUES (_app.learner_id, 'WBT Certificate Issued', 'You have earned a certificate for completing "' || NEW.title || '".', 'general', '/credentials');
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER wbt_on_project_completed
  AFTER UPDATE ON public.wbt_projects
  FOR EACH ROW EXECUTE FUNCTION public.wbt_auto_credential_on_completion();

-- Enable realtime for new table
ALTER PUBLICATION supabase_realtime ADD TABLE public.wbt_project_credentials;
