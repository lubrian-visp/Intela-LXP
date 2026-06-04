
-- ============================================
-- WBT Phase 2: Escrow, Mentor Ratings, Sprint Review Governance
-- ============================================

-- 1. WBT Escrow Transactions (payment holds and releases)
CREATE TABLE public.wbt_escrow_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.wbt_projects(id) ON DELETE CASCADE,
  sprint_id uuid REFERENCES public.wbt_sprints(id) ON DELETE SET NULL,
  transaction_type text NOT NULL DEFAULT 'hold',
  amount numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'ZAR',
  platform_fee_percent numeric DEFAULT 5,
  platform_fee_amount numeric DEFAULT 0,
  net_amount numeric DEFAULT 0,
  payer_id uuid,
  payee_id uuid,
  status text NOT NULL DEFAULT 'pending',
  payment_gateway text,
  gateway_reference text,
  released_by uuid,
  released_at timestamptz,
  release_reason text,
  second_reviewer_id uuid,
  second_review_status text DEFAULT 'not_required',
  second_review_notes text,
  second_reviewed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. WBT Mentor Ratings (post-project feedback)
CREATE TABLE public.wbt_mentor_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.wbt_projects(id) ON DELETE CASCADE,
  mentor_id uuid NOT NULL,
  rated_by uuid NOT NULL,
  rater_role text NOT NULL DEFAULT 'learner',
  communication_score integer NOT NULL CHECK (communication_score BETWEEN 1 AND 5),
  technical_score integer NOT NULL CHECK (technical_score BETWEEN 1 AND 5),
  mentorship_score integer NOT NULL CHECK (mentorship_score BETWEEN 1 AND 5),
  overall_score integer NOT NULL CHECK (overall_score BETWEEN 1 AND 5),
  feedback text,
  is_anonymous boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, rated_by)
);

-- 3. WBT Sprint Reviews (formal sprint acceptance records)
CREATE TABLE public.wbt_sprint_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id uuid NOT NULL REFERENCES public.wbt_sprints(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.wbt_projects(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL,
  reviewer_role text NOT NULL DEFAULT 'client',
  decision text NOT NULL DEFAULT 'pending',
  stories_accepted integer DEFAULT 0,
  stories_rejected integer DEFAULT 0,
  feedback text,
  reviewed_at timestamptz,
  second_reviewer_id uuid,
  second_review_decision text,
  second_review_notes text,
  second_reviewed_at timestamptz,
  payment_release_approved boolean DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE public.wbt_escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wbt_mentor_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wbt_sprint_reviews ENABLE ROW LEVEL SECURITY;

-- Escrow: project participants + admins can read
CREATE POLICY "Participants can read escrow transactions"
  ON public.wbt_escrow_transactions FOR SELECT TO authenticated
  USING (
    payer_id = auth.uid() OR payee_id = auth.uid() OR released_by = auth.uid()
    OR second_reviewer_id = auth.uid()
    OR public.is_platform_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.wbt_projects p WHERE p.id = project_id
      AND (p.created_by = auth.uid() OR p.mentor_id = auth.uid() OR p.client_id = auth.uid())
    )
  );

CREATE POLICY "Admins can insert escrow transactions"
  ON public.wbt_escrow_transactions FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.wbt_projects p WHERE p.id = project_id
      AND (p.client_id = auth.uid() OR p.created_by = auth.uid())
    )
  );

CREATE POLICY "Admins can update escrow transactions"
  ON public.wbt_escrow_transactions FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR second_reviewer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.wbt_projects p WHERE p.id = project_id
      AND (p.client_id = auth.uid() OR p.created_by = auth.uid())
    )
  );

-- Mentor Ratings: anyone can read (for reputation), participants can create
CREATE POLICY "Anyone can read mentor ratings"
  ON public.wbt_mentor_ratings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Project participants can rate mentors"
  ON public.wbt_mentor_ratings FOR INSERT TO authenticated
  WITH CHECK (
    rated_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.wbt_projects p WHERE p.id = project_id
      AND (p.client_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.wbt_project_applications a WHERE a.project_id = p.id AND a.learner_id = auth.uid() AND a.status = 'accepted'))
      )
  );

-- Sprint Reviews: project participants can read, reviewers can manage
CREATE POLICY "Participants can read sprint reviews"
  ON public.wbt_sprint_reviews FOR SELECT TO authenticated
  USING (
    reviewer_id = auth.uid() OR second_reviewer_id = auth.uid()
    OR public.is_platform_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.wbt_projects p WHERE p.id = project_id
      AND (p.created_by = auth.uid() OR p.mentor_id = auth.uid() OR p.client_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.wbt_project_applications a WHERE a.project_id = p.id AND a.learner_id = auth.uid() AND a.status = 'accepted'))
    )
  );

CREATE POLICY "Reviewers can insert sprint reviews"
  ON public.wbt_sprint_reviews FOR INSERT TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.wbt_projects p WHERE p.id = project_id
      AND (p.client_id = auth.uid() OR p.mentor_id = auth.uid() OR public.is_platform_admin(auth.uid()))
    )
  );

CREATE POLICY "Reviewers can update sprint reviews"
  ON public.wbt_sprint_reviews FOR UPDATE TO authenticated
  USING (
    reviewer_id = auth.uid() OR second_reviewer_id = auth.uid()
    OR public.is_platform_admin(auth.uid())
  );

-- ============================================
-- Trigger: Auto-require second reviewer for mentor-led paid projects
-- ============================================
CREATE OR REPLACE FUNCTION public.wbt_enforce_second_reviewer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _project record;
BEGIN
  -- Only fire on decision change
  IF OLD.decision IS NOT DISTINCT FROM NEW.decision THEN RETURN NEW; END IF;
  IF NEW.decision NOT IN ('accepted', 'approved') THEN RETURN NEW; END IF;

  SELECT * INTO _project FROM wbt_projects WHERE id = NEW.project_id;

  -- Enforce second reviewer for mentor-led paid projects
  IF _project.project_model = 'mentor_led' AND _project.payment_model = 'paid' THEN
    -- If reviewer is the mentor (conflict of interest), require second review
    IF NEW.reviewer_id = _project.mentor_id THEN
      NEW.second_review_decision := 'pending';
      -- Auto-flag: payment cannot be released until second review
      NEW.payment_release_approved := false;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER wbt_sprint_reviews_second_reviewer
  BEFORE UPDATE ON public.wbt_sprint_reviews
  FOR EACH ROW EXECUTE FUNCTION public.wbt_enforce_second_reviewer();

-- ============================================
-- Trigger: Auto-calculate escrow fees
-- ============================================
CREATE OR REPLACE FUNCTION public.wbt_calculate_escrow_fees()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.amount IS NOT NULL AND NEW.platform_fee_percent IS NOT NULL THEN
    NEW.platform_fee_amount := ROUND(NEW.amount * (NEW.platform_fee_percent / 100), 2);
    NEW.net_amount := NEW.amount - NEW.platform_fee_amount;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER wbt_escrow_calc_fees
  BEFORE INSERT OR UPDATE ON public.wbt_escrow_transactions
  FOR EACH ROW EXECUTE FUNCTION public.wbt_calculate_escrow_fees();

-- ============================================
-- Trigger: Notify second reviewer when sprint is accepted
-- ============================================
CREATE OR REPLACE FUNCTION public.wbt_notify_second_reviewer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.second_review_decision = 'pending' AND (OLD.second_review_decision IS DISTINCT FROM 'pending') THEN
    -- Notify all operations and super_admin users
    INSERT INTO notifications (user_id, title, body, category, reference_table, reference_id, action_url)
    SELECT ur.user_id,
      'WBT Second Review Required',
      'A mentor-led paid sprint review requires your approval before payment can be released.',
      'approval', 'wbt_sprint_reviews', NEW.id, '/wbt/project/' || NEW.project_id
    FROM user_roles ur
    WHERE ur.role IN ('operations', 'super_admin')
      AND ur.user_id IS DISTINCT FROM NEW.reviewer_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER wbt_sprint_reviews_notify_second
  AFTER UPDATE ON public.wbt_sprint_reviews
  FOR EACH ROW EXECUTE FUNCTION public.wbt_notify_second_reviewer();

-- ============================================
-- Updated_at triggers
-- ============================================
CREATE TRIGGER wbt_escrow_updated_at BEFORE UPDATE ON public.wbt_escrow_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER wbt_sprint_reviews_updated_at BEFORE UPDATE ON public.wbt_sprint_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for sprint reviews (live approval tracking)
ALTER PUBLICATION supabase_realtime ADD TABLE public.wbt_sprint_reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wbt_escrow_transactions;
