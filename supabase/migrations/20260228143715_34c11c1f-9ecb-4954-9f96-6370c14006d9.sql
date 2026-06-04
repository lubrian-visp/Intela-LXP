
-- ============================================================
-- Sponsor Profiles — company-specific fields for sponsor users
-- ============================================================
CREATE TABLE public.sponsor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  company_name text NOT NULL,
  registration_number text,
  bee_level text,
  sector text,
  industry text,
  contact_person text,
  contact_email text,
  contact_phone text,
  billing_address text,
  billing_email text,
  vat_number text,
  country_id uuid REFERENCES public.countries(id),
  status text NOT NULL DEFAULT 'pending_approval',
  approved_by uuid,
  approved_at timestamptz,
  rejection_reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sponsor_profiles ENABLE ROW LEVEL SECURITY;

-- Sponsors see own profile
CREATE POLICY "Sponsors read own profile"
  ON public.sponsor_profiles FOR SELECT
  USING (user_id = auth.uid());

-- Sponsors update own profile
CREATE POLICY "Sponsors update own profile"
  ON public.sponsor_profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Sponsors insert own profile (self-registration)
CREATE POLICY "Sponsors insert own profile"
  ON public.sponsor_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins/ops manage all sponsor profiles
CREATE POLICY "Admins manage sponsor profiles"
  ON public.sponsor_profiles FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
    OR has_role(auth.uid(), 'programme_manager'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
    OR has_role(auth.uid(), 'programme_manager'::app_role)
  );

-- ============================================================
-- Sponsor Programme/Cohort Links — multi-level sponsorship
-- ============================================================
CREATE TABLE public.sponsor_programme_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id uuid NOT NULL,  -- references user_id of the sponsor
  link_type text NOT NULL DEFAULT 'programme',  -- 'programme', 'cohort', 'individual'
  programme_id uuid REFERENCES public.programmes(id),
  cohort_id uuid REFERENCES public.cohorts(id),
  enrolment_id uuid REFERENCES public.enrolments(id),
  funding_amount numeric,
  funding_currency text DEFAULT 'ZAR',
  contract_reference text,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'active',
  created_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Ensure at least one target is set based on link_type
  CONSTRAINT valid_link_target CHECK (
    (link_type = 'programme' AND programme_id IS NOT NULL) OR
    (link_type = 'cohort' AND cohort_id IS NOT NULL) OR
    (link_type = 'individual' AND enrolment_id IS NOT NULL)
  )
);

ALTER TABLE public.sponsor_programme_links ENABLE ROW LEVEL SECURITY;

-- Sponsors see own links
CREATE POLICY "Sponsors read own links"
  ON public.sponsor_programme_links FOR SELECT
  USING (sponsor_id = auth.uid());

-- Admins manage all links
CREATE POLICY "Admins manage sponsor links"
  ON public.sponsor_programme_links FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
    OR has_role(auth.uid(), 'programme_manager'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
    OR has_role(auth.uid(), 'programme_manager'::app_role)
  );

-- ============================================================
-- Sponsor Invitations — admin-initiated invite tokens
-- ============================================================
CREATE TABLE public.sponsor_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  company_name text NOT NULL,
  invited_by uuid NOT NULL,
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'pending', -- pending, accepted, expired, revoked
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  programme_ids uuid[] DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sponsor_invitations ENABLE ROW LEVEL SECURITY;

-- Admins manage invitations
CREATE POLICY "Admins manage sponsor invitations"
  ON public.sponsor_invitations FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
    OR has_role(auth.uid(), 'programme_manager'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
    OR has_role(auth.uid(), 'programme_manager'::app_role)
  );

-- Public can read invitations by token (for self-registration flow)
CREATE POLICY "Public read invitations by token"
  ON public.sponsor_invitations FOR SELECT
  USING (true);

-- Timestamp trigger
CREATE TRIGGER update_sponsor_profiles_updated_at
  BEFORE UPDATE ON public.sponsor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sponsor_links_updated_at
  BEFORE UPDATE ON public.sponsor_programme_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sponsor_invitations_updated_at
  BEFORE UPDATE ON public.sponsor_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_sponsor_profiles_user_id ON public.sponsor_profiles(user_id);
CREATE INDEX idx_sponsor_profiles_status ON public.sponsor_profiles(status);
CREATE INDEX idx_sponsor_links_sponsor_id ON public.sponsor_programme_links(sponsor_id);
CREATE INDEX idx_sponsor_links_programme ON public.sponsor_programme_links(programme_id);
CREATE INDEX idx_sponsor_links_cohort ON public.sponsor_programme_links(cohort_id);
CREATE INDEX idx_sponsor_invitations_token ON public.sponsor_invitations(token);
CREATE INDEX idx_sponsor_invitations_email ON public.sponsor_invitations(email);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.sponsor_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sponsor_programme_links;
