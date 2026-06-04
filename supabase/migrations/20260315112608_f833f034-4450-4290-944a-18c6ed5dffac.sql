
-- ═══════════════════════════════════════════════════════════════
-- LXP Enhancement: Skills, UGC, Ratings, Recommendations
-- ═══════════════════════════════════════════════════════════════

-- 1. Skills catalogue
CREATE TABLE public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'general',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read skills"
  ON public.skills FOR SELECT TO authenticated USING (true);

CREATE POLICY "Platform admins can manage skills"
  ON public.skills FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- 2. Content-to-skill tagging
CREATE TABLE public.content_skill_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id uuid REFERENCES public.skills(id) ON DELETE CASCADE NOT NULL,
  content_block_id uuid REFERENCES public.content_blocks(id) ON DELETE CASCADE,
  assessment_id uuid REFERENCES public.assessments(id) ON DELETE CASCADE,
  programme_id uuid REFERENCES public.programmes(id) ON DELETE CASCADE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.content_skill_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read skill tags"
  ON public.content_skill_tags FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage skill tags"
  ON public.content_skill_tags FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'programme', 'create'))
  WITH CHECK (public.has_permission(auth.uid(), 'programme', 'create'));

-- 3. Learner skill profiles
CREATE TABLE public.learner_skill_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL,
  skill_id uuid REFERENCES public.skills(id) ON DELETE CASCADE NOT NULL,
  proficiency_level integer NOT NULL DEFAULT 0,
  target_level integer NOT NULL DEFAULT 3,
  last_assessed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(learner_id, skill_id)
);

ALTER TABLE public.learner_skill_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners can view own skill profiles"
  ON public.learner_skill_profiles FOR SELECT TO authenticated
  USING (learner_id = auth.uid() OR public.is_platform_admin(auth.uid()) OR public.has_permission(auth.uid(), 'programme', 'create'));

CREATE POLICY "Learners can update own skill profiles"
  ON public.learner_skill_profiles FOR INSERT TO authenticated
  WITH CHECK (learner_id = auth.uid());

CREATE POLICY "Learners can modify own skill profiles"
  ON public.learner_skill_profiles FOR UPDATE TO authenticated
  USING (learner_id = auth.uid() OR public.is_platform_admin(auth.uid()));

-- 4. User-generated content
CREATE TABLE public.user_generated_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  content_type text NOT NULL DEFAULT 'document',
  content_url text,
  file_path text,
  thumbnail_url text,
  status text NOT NULL DEFAULT 'pending',
  moderation_notes text,
  moderated_by uuid,
  moderated_at timestamptz,
  published_at timestamptz,
  relevance_score integer,
  accuracy_verified boolean NOT NULL DEFAULT false,
  tags text[] DEFAULT '{}',
  view_count integer NOT NULL DEFAULT 0,
  programme_id uuid REFERENCES public.programmes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_generated_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read published UGC"
  ON public.user_generated_content FOR SELECT TO authenticated
  USING (status = 'published' OR author_id = auth.uid() OR public.is_platform_admin(auth.uid()) OR public.has_permission(auth.uid(), 'programme', 'create'));

CREATE POLICY "Authenticated can create UGC"
  ON public.user_generated_content FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors can update own UGC"
  ON public.user_generated_content FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.is_platform_admin(auth.uid()) OR public.has_permission(auth.uid(), 'programme', 'create'));

CREATE POLICY "Authors can delete own pending UGC"
  ON public.user_generated_content FOR DELETE TO authenticated
  USING (author_id = auth.uid() AND status = 'pending');

-- 5. Content ratings
CREATE TABLE public.content_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content_block_id uuid REFERENCES public.content_blocks(id) ON DELETE CASCADE,
  ugc_id uuid REFERENCES public.user_generated_content(id) ON DELETE CASCADE,
  rating integer NOT NULL,
  review_text text,
  is_helpful boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.content_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read ratings"
  ON public.content_ratings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage own ratings"
  ON public.content_ratings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own ratings"
  ON public.content_ratings FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own ratings"
  ON public.content_ratings FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 6. Content comments
CREATE TABLE public.content_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content_block_id uuid REFERENCES public.content_blocks(id) ON DELETE CASCADE,
  ugc_id uuid REFERENCES public.user_generated_content(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES public.content_comments(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_flagged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.content_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read comments"
  ON public.content_comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create comments"
  ON public.content_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own comments"
  ON public.content_comments FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own comments"
  ON public.content_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 7. Learning recommendations
CREATE TABLE public.learning_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL,
  content_block_id uuid REFERENCES public.content_blocks(id) ON DELETE CASCADE,
  ugc_id uuid REFERENCES public.user_generated_content(id) ON DELETE CASCADE,
  programme_id uuid REFERENCES public.programmes(id) ON DELETE CASCADE,
  recommendation_type text NOT NULL DEFAULT 'ai',
  reason text,
  relevance_score numeric NOT NULL DEFAULT 0,
  is_dismissed boolean NOT NULL DEFAULT false,
  is_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE public.learning_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners can view own recommendations"
  ON public.learning_recommendations FOR SELECT TO authenticated
  USING (learner_id = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE POLICY "System can create recommendations"
  ON public.learning_recommendations FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Learners can update own recommendations"
  ON public.learning_recommendations FOR UPDATE TO authenticated
  USING (learner_id = auth.uid());

-- 8. External content providers (mock)
CREATE TABLE public.external_content_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name text NOT NULL,
  provider_type text NOT NULL DEFAULT 'api',
  base_url text,
  api_key_configured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  config jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.external_content_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read providers"
  ON public.external_content_providers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage providers"
  ON public.external_content_providers FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- 9. External content items (mock)
CREATE TABLE public.external_content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES public.external_content_providers(id) ON DELETE CASCADE NOT NULL,
  external_id text,
  title text NOT NULL,
  description text,
  content_url text,
  thumbnail_url text,
  content_type text DEFAULT 'course',
  duration_minutes integer,
  difficulty_level text DEFAULT 'intermediate',
  tags text[] DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.external_content_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read external content"
  ON public.external_content_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage external content"
  ON public.external_content_items FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- Enable realtime for key LXP tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_ratings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.learning_recommendations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_generated_content;
