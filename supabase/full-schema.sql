-- ============================================================
-- Intela SkillChain – Complete Database Schema
-- Generated: 2026-03-27 (from live database)
-- Tables: 154
-- ============================================================

-- ── EXTENSIONS ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── ENUMS ──────────────────────────────────────────────────
CREATE TYPE public.app_role AS ENUM ('super_admin', 'programme_manager', 'facilitator', 'assessor', 'moderator', 'mentor', 'learner', 'sponsor', 'operations', 'systems_admin', 'talent_manager');

-- ── SEQUENCES ─────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.learner_number_seq START 10001 INCREMENT 1;

-- ── TABLES ─────────────────────────────────────────────────

CREATE TABLE public.announcement_reads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL,
  user_id uuid NOT NULL,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  priority text NOT NULL DEFAULT 'normal'::text,
  scope_type text NOT NULL DEFAULT 'global'::text,
  scope_id uuid,
  author_id uuid NOT NULL,
  published_at timestamp with time zone,
  expires_at timestamp with time zone,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  tenant_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE public.approval_routing_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  description text,
  scope_type text NOT NULL DEFAULT 'programme'::text,
  scope_value text,
  approver_user_id uuid,
  approver_role text,
  step_order integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.approval_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_type text NOT NULL,
  reference_id uuid NOT NULL,
  reference_table text NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending'::text,
  assigned_to uuid,
  assigned_role text,
  requested_by uuid,
  decided_by uuid,
  decided_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.assessment_links (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL,
  pathway_id uuid,
  module_id uuid,
  lesson_id uuid,
  link_type text NOT NULL DEFAULT 'module_only'::text,
  is_inherited boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.assessment_rubrics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL,
  rubric_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.assessment_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL,
  time_limit_minutes integer,
  attempts_allowed integer DEFAULT 1,
  availability_start timestamp with time zone,
  availability_end timestamp with time zone,
  display_mode text NOT NULL DEFAULT 'all_at_once'::text,
  allow_backtracking boolean NOT NULL DEFAULT true,
  show_question_flagging boolean NOT NULL DEFAULT true,
  feedback_release text NOT NULL DEFAULT 'after_submission'::text,
  randomise_questions boolean NOT NULL DEFAULT false,
  randomise_options boolean NOT NULL DEFAULT false,
  show_correct_answers boolean NOT NULL DEFAULT true,
  require_lockdown_browser boolean NOT NULL DEFAULT false,
  access_code text,
  ip_restrictions text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.assessment_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL,
  learner_id uuid NOT NULL,
  enrolment_id uuid,
  status text NOT NULL DEFAULT 'pending'::text,
  score numeric,
  feedback text,
  assessor_id uuid,
  moderator_id uuid,
  submitted_at timestamp with time zone,
  assessed_at timestamp with time zone,
  moderated_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  moderation_status text NOT NULL DEFAULT 'not_required'::text,
  moderation_notes text,
  PRIMARY KEY (id)
);

CREATE TABLE public.assessments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  module_id uuid,
  programme_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  assessment_type text NOT NULL DEFAULT 'formative'::text,
  max_score integer DEFAULT 100,
  pass_mark integer DEFAULT 50,
  weighting numeric DEFAULT 100,
  due_date date,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  assessment_category text NOT NULL DEFAULT 'formative'::text,
  PRIMARY KEY (id)
);

CREATE TABLE public.assessor_report_template_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL,
  version_number integer NOT NULL DEFAULT 1,
  section2_criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  section3_criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  changed_by uuid,
  change_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.assessor_report_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Default Assessor Report Template'::text,
  scope_level text NOT NULL DEFAULT 'global'::text,
  programme_id uuid,
  section2_criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  section3_criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.assessor_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessor_id uuid NOT NULL,
  programme_id uuid NOT NULL,
  cohort_id uuid,
  status text NOT NULL DEFAULT 'draft'::text,
  assessor_name text,
  submission_date date,
  client_name text,
  venue text,
  programme_name text,
  start_date date,
  end_date date,
  section2_criteria jsonb DEFAULT '[]'::jsonb,
  section2_problems text,
  section2_strengths text,
  section3_criteria jsonb DEFAULT '[]'::jsonb,
  section3_problems text,
  section3_strengths text,
  section3_recommendations text,
  section3_evidence text,
  section4_learners jsonb DEFAULT '[]'::jsonb,
  section5_difficulties text,
  section5_conflicts text,
  section5_mentor_update text,
  section5_declaration text DEFAULT 'All learners who submitted evidence were assessed as guided by outcome based Principles.'::text,
  assessor_signature_date date,
  admin_signature_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  report_mode text NOT NULL DEFAULT 'cohort'::text,
  learner_id uuid,
  module_us_covered text,
  PRIMARY KEY (id)
);

CREATE TABLE public.audit_findings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL,
  finding_type text NOT NULL DEFAULT 'observation'::text,
  title text NOT NULL,
  description text,
  clause_reference text,
  severity text NOT NULL DEFAULT 'minor'::text,
  status text NOT NULL DEFAULT 'open'::text,
  assigned_to uuid,
  due_date date,
  corrective_action text,
  root_cause text,
  evidence text,
  closed_at timestamp with time zone,
  closed_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.badges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT 'award'::text,
  color text NOT NULL DEFAULT '#f59e0b'::text,
  category text NOT NULL DEFAULT 'achievement'::text,
  criteria_type text NOT NULL DEFAULT 'manual'::text,
  criteria_value jsonb,
  points_value integer NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.certificate_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  programme_type_id uuid,
  programme_id uuid,
  template_html text NOT NULL DEFAULT '<div>Certificate of Completion</div>'::text,
  background_color text DEFAULT '#ffffff'::text,
  accent_color text DEFAULT '#1a365d'::text,
  logo_url text,
  signatory_name text,
  signatory_title text,
  is_default boolean DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.challenge_exam_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL,
  learner_id uuid NOT NULL,
  score numeric,
  passed boolean DEFAULT false,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  answers jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.challenge_exams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  programme_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Challenge Exam'::text,
  description text,
  passing_grade numeric NOT NULL DEFAULT 70,
  time_limit_minutes integer DEFAULT 60,
  max_attempts integer DEFAULT 1,
  question_count integer DEFAULT 20,
  question_pool_assessment_ids uuid[] DEFAULT '{}'::uuid[],
  is_active boolean DEFAULT true,
  on_pass_action text DEFAULT 'auto_complete'::text,
  on_fail_action text DEFAULT 'redirect_course'::text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.cms_menu_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  menu_id uuid NOT NULL,
  parent_item_id uuid,
  label text NOT NULL,
  item_type text NOT NULL DEFAULT 'built_in'::text,
  target_path text,
  external_url text,
  page_id uuid,
  icon_name text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  open_in_new_tab boolean NOT NULL DEFAULT false,
  css_class text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.cms_menus (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.cms_page_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL,
  block_type text NOT NULL DEFAULT 'text'::text,
  title text,
  content jsonb DEFAULT '{}'::jsonb,
  config jsonb DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.cms_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL,
  description text,
  is_published boolean NOT NULL DEFAULT false,
  is_homepage boolean NOT NULL DEFAULT false,
  meta_title text,
  meta_description text,
  created_by uuid,
  published_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.cms_role_menu_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  menu_id uuid,
  menu_item_id uuid,
  role text NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.cohort_staff_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cohort_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL,
  assigned_by uuid,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.cohorts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  programme_id uuid NOT NULL,
  name text NOT NULL,
  code text,
  start_date date,
  end_date date,
  max_learners integer DEFAULT 30,
  status text NOT NULL DEFAULT 'planned'::text,
  facilitator_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  tenant_id uuid,
  archived_at timestamp with time zone,
  archived_by uuid,
  PRIMARY KEY (id)
);

CREATE TABLE public.compliance_requirements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  mapping_id uuid NOT NULL,
  requirement_type text NOT NULL,
  name text NOT NULL,
  description text,
  responsible_body_id uuid,
  is_mandatory boolean NOT NULL DEFAULT true,
  frequency text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.content_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL,
  block_type text NOT NULL DEFAULT 'text'::text,
  title text NOT NULL,
  content jsonb DEFAULT '{}'::jsonb,
  file_url text,
  sequence_order integer NOT NULL DEFAULT 1,
  duration_minutes integer,
  is_required boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  lesson_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE public.content_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content_block_id uuid,
  ugc_id uuid,
  parent_comment_id uuid,
  body text NOT NULL,
  is_flagged boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.content_prerequisites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  content_block_id uuid NOT NULL,
  prerequisite_block_id uuid NOT NULL,
  prerequisite_type text NOT NULL DEFAULT 'completion'::text,
  min_score numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.content_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content_block_id uuid,
  ugc_id uuid,
  rating integer NOT NULL,
  review_text text,
  is_helpful boolean,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.content_skill_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  skill_id uuid NOT NULL,
  content_block_id uuid,
  assessment_id uuid,
  programme_id uuid,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.countries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iso_code varchar(3) NOT NULL,
  name text NOT NULL,
  region text NOT NULL,
  sub_region text,
  currency_code varchar(3) NOT NULL DEFAULT 'USD'::character varying,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.country_regulatory_frameworks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  country_id uuid NOT NULL,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'active'::text,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  expiry_date date,
  review_date date,
  legislative_references jsonb DEFAULT '[]'::jsonb,
  sector_regulations jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.course_content_links (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  shared_item_id uuid NOT NULL,
  programme_id uuid,
  module_id uuid,
  lesson_id uuid,
  position integer NOT NULL DEFAULT 0,
  custom_settings jsonb DEFAULT '{}'::jsonb,
  pinned_version integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.delegated_approvers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  delegated_user_id uuid NOT NULL,
  assigned_by uuid NOT NULL,
  scope_type text NOT NULL DEFAULT 'global'::text,
  scope_value uuid,
  expires_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  revoked_at timestamp with time zone,
  revoked_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.deletion_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  entity_name text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.directory_oversight_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  target_role text NOT NULL,
  feature_key text NOT NULL,
  is_disabled boolean NOT NULL DEFAULT false,
  disabled_by uuid,
  disabled_at timestamp with time zone,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.discussion_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL,
  author_id uuid NOT NULL,
  body text NOT NULL,
  parent_post_id uuid,
  is_solution boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.discussion_threads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  scope_type text NOT NULL DEFAULT 'programme'::text,
  scope_id uuid NOT NULL,
  author_id uuid NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  is_locked boolean NOT NULL DEFAULT false,
  reply_count integer NOT NULL DEFAULT 0,
  last_activity_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.document_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL,
  requested_by uuid,
  document_types text[] NOT NULL DEFAULT '{}'::text[],
  message text,
  secure_upload_token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'::text),
  status text NOT NULL DEFAULT 'pending'::text,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + '7 days'::interval),
  fulfilled_at timestamp with time zone,
  reminder_count integer NOT NULL DEFAULT 0,
  last_reminder_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.drip_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  programme_id uuid NOT NULL,
  module_id uuid,
  lesson_id uuid,
  content_block_id uuid,
  drip_type text NOT NULL DEFAULT 'days_after_enrolment'::text,
  drip_value integer DEFAULT 0,
  drip_date date,
  is_sample boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.enrolment_toggles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  scope_level text NOT NULL,
  scope_id uuid,
  is_enabled boolean NOT NULL DEFAULT false,
  reason text,
  changed_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.enrolments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cohort_id uuid,
  learner_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  enrolled_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  approved_by uuid,
  mentor_id uuid,
  sponsor_id uuid,
  progress_percentage integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  tenant_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE public.external_content_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  external_id text,
  title text NOT NULL,
  description text,
  content_url text,
  thumbnail_url text,
  content_type text DEFAULT 'course'::text,
  duration_minutes integer,
  difficulty_level text DEFAULT 'intermediate'::text,
  tags text[] DEFAULT '{}'::text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.external_content_providers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_name text NOT NULL,
  provider_type text NOT NULL DEFAULT 'api'::text,
  base_url text,
  api_key_configured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.feature_flags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  flag_key text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  description text,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.font_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  before_value jsonb,
  after_value jsonb,
  notes text,
  performed_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.font_library (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  font_source text NOT NULL DEFAULT 'google'::text,
  family_name text NOT NULL,
  category text DEFAULT 'sans-serif'::text,
  variants jsonb NOT NULL DEFAULT '["400"]'::jsonb,
  subsets jsonb DEFAULT '["latin"]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  is_favorite boolean NOT NULL DEFAULT false,
  file_urls jsonb DEFAULT '{}'::jsonb,
  license_type text,
  license_expiry date,
  popularity_rank integer DEFAULT 0,
  preview_text text DEFAULT 'The quick brown fox jumps over the lazy dog'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  PRIMARY KEY (id)
);

CREATE TABLE public.funding_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  framework_id uuid NOT NULL,
  funding_type text NOT NULL,
  name text NOT NULL,
  description text,
  rate_or_amount text,
  eligibility_criteria jsonb DEFAULT '{}'::jsonb,
  claim_process text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.incentive_schemes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  country_id uuid NOT NULL,
  scheme_name text NOT NULL,
  scheme_type text NOT NULL,
  description text,
  config jsonb DEFAULT '{}'::jsonb,
  target_groups jsonb DEFAULT '[]'::jsonb,
  points_multipliers jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.internal_audits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  audit_type text NOT NULL DEFAULT 'internal'::text,
  standard_reference text,
  status text NOT NULL DEFAULT 'planned'::text,
  scheduled_date date,
  completed_date date,
  lead_auditor_id uuid,
  scope text,
  objectives text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.issued_credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  enrolment_id uuid NOT NULL,
  learner_id uuid NOT NULL,
  programme_id uuid NOT NULL,
  credential_type text NOT NULL DEFAULT 'certificate'::text,
  title text NOT NULL,
  issued_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  blockchain_hash text,
  verification_url text,
  status text NOT NULL DEFAULT 'active'::text,
  issued_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.learner_badges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL,
  badge_id uuid NOT NULL,
  enrolment_id uuid,
  earned_at timestamp with time zone NOT NULL DEFAULT now(),
  awarded_by uuid,
  PRIMARY KEY (id)
);

CREATE TABLE public.learner_bookmarks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL,
  content_block_id uuid NOT NULL,
  enrolment_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.learner_content_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL,
  content_block_id uuid NOT NULL,
  module_id uuid NOT NULL,
  enrolment_id uuid NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  time_spent_seconds integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.learner_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL,
  document_type text NOT NULL,
  document_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  mime_type text,
  status text NOT NULL DEFAULT 'pending_review'::text,
  rejection_reason text,
  verified_by uuid,
  verified_at timestamp with time zone,
  uploaded_by uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  validation_mode text NOT NULL DEFAULT 'manual'::text,
  confidence_score numeric,
  validation_status text NOT NULL DEFAULT 'pending'::text,
  extracted_data jsonb DEFAULT '{}'::jsonb,
  validation_details jsonb DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
);

CREATE TABLE public.learner_eligibility_checks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL,
  check_type text NOT NULL,
  is_passed boolean NOT NULL DEFAULT false,
  details text,
  checked_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.learner_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL,
  content_block_id uuid,
  module_id uuid,
  enrolment_id uuid NOT NULL,
  note_text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.learner_points (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL,
  enrolment_id uuid,
  points integer NOT NULL,
  reason text NOT NULL,
  reference_type text,
  reference_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.learner_registrations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  date_of_birth date,
  address text,
  gender text,
  country text DEFAULT 'South Africa'::text,
  national_id text,
  disability text DEFAULT 'No'::text,
  education_level text,
  programme_id uuid,
  programme_name text,
  documents jsonb DEFAULT '{}'::jsonb,
  learner_number text,
  registration_method text NOT NULL DEFAULT 'staff-direct'::text,
  status text NOT NULL DEFAULT 'pending_approval'::text,
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  registered_by uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  sla_started_at timestamp with time zone,
  sla_paused_at timestamp with time zone,
  sla_paused_duration_minutes integer DEFAULT 0,
  sla_deadline_at timestamp with time zone,
  sla_breached boolean DEFAULT false,
  is_archived boolean DEFAULT false,
  user_id uuid,
  tenant_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE public.learner_skill_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL,
  skill_id uuid NOT NULL,
  proficiency_level integer NOT NULL DEFAULT 0,
  target_level integer NOT NULL DEFAULT 3,
  last_assessed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.learning_recommendations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL,
  content_block_id uuid,
  ugc_id uuid,
  programme_id uuid,
  recommendation_type text NOT NULL DEFAULT 'ai'::text,
  reason text,
  relevance_score numeric NOT NULL DEFAULT 0,
  is_dismissed boolean NOT NULL DEFAULT false,
  is_completed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  PRIMARY KEY (id)
);

CREATE TABLE public.lessons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  learning_objective text,
  sequence_order integer NOT NULL DEFAULT 1,
  duration_minutes integer,
  is_mandatory boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.lti_registrations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  platform_name text NOT NULL,
  issuer text NOT NULL,
  client_id text NOT NULL,
  auth_endpoint text NOT NULL,
  token_endpoint text NOT NULL,
  jwks_endpoint text NOT NULL,
  deployment_id text,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.lti_resource_links (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL,
  assessment_id uuid NOT NULL,
  resource_link_id text NOT NULL,
  title text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.meeting_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  display_name text,
  role text NOT NULL DEFAULT 'attendee'::text,
  is_hand_raised boolean NOT NULL DEFAULT false,
  is_muted boolean NOT NULL DEFAULT false,
  is_video_on boolean NOT NULL DEFAULT true,
  is_screen_sharing boolean NOT NULL DEFAULT false,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  left_at timestamp with time zone,
  status text NOT NULL DEFAULT 'in_lobby'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.meeting_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  reaction_type text NOT NULL DEFAULT 'like'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.mentor_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL,
  mentee_id uuid NOT NULL,
  enrolment_id uuid,
  title text NOT NULL,
  description text,
  target_date date,
  status text NOT NULL DEFAULT 'in_progress'::text,
  progress_percentage integer DEFAULT 0,
  mentor_notes text,
  mentee_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.mentor_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  enrolment_id uuid,
  body text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.mentor_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL,
  mentee_id uuid NOT NULL,
  enrolment_id uuid,
  session_type text NOT NULL DEFAULT 'check_in'::text,
  scheduled_at timestamp with time zone NOT NULL,
  duration_minutes integer DEFAULT 30,
  status text NOT NULL DEFAULT 'scheduled'::text,
  location text,
  notes text,
  action_items jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.moderation_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  item_type text NOT NULL DEFAULT 'forum_post'::text,
  submitted_by uuid NOT NULL,
  programme_id uuid,
  content text NOT NULL,
  reason text NOT NULL,
  flagged_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending'::text,
  priority text NOT NULL DEFAULT 'medium'::text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  moderation_feedback text,
  rejection_category text,
  submission_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE public.moderator_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  moderator_id uuid NOT NULL,
  report_mode text NOT NULL DEFAULT 'cohort'::text,
  programme_id uuid NOT NULL,
  cohort_id uuid,
  status text NOT NULL DEFAULT 'draft'::text,
  total_items_reviewed integer DEFAULT 0,
  approved_count integer DEFAULT 0,
  rejected_count integer DEFAULT 0,
  avg_turnaround_hours numeric DEFAULT 0,
  sampling_target_pct numeric DEFAULT 25,
  sampling_achieved_pct numeric DEFAULT 0,
  summary_notes text,
  assessor_performance jsonb DEFAULT '[]'::jsonb,
  systemic_issues text,
  patterns_observed text,
  recommendations text,
  improvement_actions text,
  declaration_text text DEFAULT 'I hereby declare that this moderation was conducted in accordance with organisational quality assurance policies, the Four-Eyes Principle was observed, and no conflicts of interest were present.'::text,
  moderator_signature_date text,
  qa_manager_signature_date text,
  report_date text,
  period_start text,
  period_end text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.module_prerequisites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL,
  prerequisite_module_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  in_app_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  category text NOT NULL DEFAULT 'general'::text,
  reference_table text,
  reference_id uuid,
  action_url text,
  is_read boolean NOT NULL DEFAULT false,
  email_sent boolean NOT NULL DEFAULT false,
  email_sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.onboarding_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  performed_by uuid,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.pathways (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  programme_id uuid NOT NULL,
  phase text NOT NULL DEFAULT 'knowledge'::text,
  version text NOT NULL DEFAULT 'v1.0'::text,
  status text NOT NULL DEFAULT 'draft'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.payment_gateways (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  gateway_key text NOT NULL,
  name text NOT NULL,
  tagline text,
  region text,
  status text NOT NULL DEFAULT 'inactive'::text,
  is_primary boolean NOT NULL DEFAULT false,
  test_mode boolean NOT NULL DEFAULT true,
  methods text[] DEFAULT '{}'::text[],
  currencies text[] DEFAULT '{}'::text[],
  config jsonb DEFAULT '{}'::jsonb,
  webhook_url text,
  webhook_secret_key_name text,
  public_key_name text,
  secret_key_name text,
  branding_color text,
  created_by uuid,
  tenant_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.payment_routing_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  currency text NOT NULL,
  primary_gateway_id uuid NOT NULL,
  fallback_gateway_id uuid,
  reason text,
  min_amount numeric,
  max_amount numeric,
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  tenant_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.payment_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  gateway_id uuid NOT NULL,
  external_ref text,
  amount numeric NOT NULL,
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  payment_method text,
  customer_email text,
  customer_name text,
  metadata jsonb DEFAULT '{}'::jsonb,
  tenant_id uuid,
  user_id uuid,
  enrolment_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.payment_webhook_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  gateway_id uuid NOT NULL,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'received'::text,
  reference text,
  payload jsonb DEFAULT '{}'::jsonb,
  response_code integer,
  error_message text,
  processed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.peer_review_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL,
  reviewer_id uuid NOT NULL,
  reviewee_id uuid NOT NULL,
  submission_id uuid,
  status text NOT NULL DEFAULT 'pending'::text,
  due_date timestamp with time zone,
  assigned_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.peer_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL,
  reviewer_id uuid NOT NULL,
  score numeric,
  feedback text,
  rubric_scores jsonb DEFAULT '[]'::jsonb,
  is_anonymous boolean DEFAULT true,
  submitted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.plagiarism_checks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL,
  learner_id uuid NOT NULL,
  similarity_score numeric DEFAULT 0,
  flagged_segments jsonb DEFAULT '[]'::jsonb,
  ai_analysis text,
  status text NOT NULL DEFAULT 'pending'::text,
  checked_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.platform_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  setting_key text NOT NULL,
  setting_value text NOT NULL DEFAULT ''::text,
  category text NOT NULL DEFAULT 'general'::text,
  label text NOT NULL,
  description text,
  setting_type text NOT NULL DEFAULT 'text'::text,
  is_editable boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.policy_document_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL,
  version_number integer NOT NULL,
  content text,
  change_summary text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.policy_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general'::text,
  standard_references text[],
  status text NOT NULL DEFAULT 'draft'::text,
  version integer NOT NULL DEFAULT 1,
  content text,
  approved_by uuid,
  approved_at timestamp with time zone,
  effective_date date,
  review_date date,
  owner_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.proctoring_violations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL,
  learner_id uuid NOT NULL,
  violation_type text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  severity text NOT NULL DEFAULT 'warning'::text,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text,
  avatar_url text,
  phone text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  job_title text,
  department text,
  location text,
  organisation text,
  email text,
  status text NOT NULL DEFAULT 'active'::text,
  verified_at timestamp with time zone,
  PRIMARY KEY (id)
);

CREATE TABLE public.programme_assessment_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  programme_id uuid NOT NULL,
  assessment_type text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  requires_moderation boolean NOT NULL DEFAULT false,
  weighting numeric,
  max_attempts integer NOT NULL DEFAULT 1,
  allow_resubmission boolean NOT NULL DEFAULT false,
  pass_mark integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.programme_completion_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  programme_id uuid NOT NULL,
  completion_message text DEFAULT 'Congratulations! You have completed this programme.'::text,
  show_certificate boolean DEFAULT true,
  show_social_share boolean DEFAULT true,
  show_next_recommendations boolean DEFAULT true,
  recommended_programme_ids uuid[] DEFAULT '{}'::uuid[],
  custom_html text,
  redirect_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.programme_enrolment_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  programme_id uuid NOT NULL,
  enrolment_mode text NOT NULL DEFAULT 'free'::text,
  price numeric DEFAULT 0,
  currency text DEFAULT 'ZAR'::text,
  recurring_interval text,
  free_trial_days integer DEFAULT 0,
  capacity_limit integer,
  waitlist_enabled boolean DEFAULT false,
  enrolment_start date,
  enrolment_end date,
  duration_days integer,
  duration_type text DEFAULT 'lifetime'::text,
  duration_end_date date,
  allow_re_enrolment boolean DEFAULT false,
  coupon_codes jsonb DEFAULT '[]'::jsonb,
  gateway_key text,
  prerequisite_programme_ids uuid[] DEFAULT '{}'::uuid[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.programme_lifecycle_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  programme_id uuid NOT NULL,
  performed_by uuid NOT NULL,
  role_at_action text NOT NULL,
  action text NOT NULL,
  previous_status text,
  new_status text,
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.programme_modules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  programme_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  module_type text DEFAULT 'theory'::text,
  sequence_order integer NOT NULL DEFAULT 1,
  credits integer DEFAULT 0,
  duration_hours integer,
  is_mandatory boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  pathway_id uuid,
  prerequisite_module_id uuid,
  credential_label text,
  unit_standard_code text,
  nqf_level integer,
  PRIMARY KEY (id)
);

CREATE TABLE public.programme_type_country_mappings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  programme_type_name text NOT NULL,
  country_id uuid NOT NULL,
  local_name text NOT NULL,
  regulatory_body_id uuid,
  qualification_framework_id uuid,
  behaviour_overrides jsonb DEFAULT '{}'::jsonb,
  workplace_percentage integer,
  theory_percentage integer,
  mentor_requirements text,
  verification_requirements text,
  additional_rules jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.programme_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  color text NOT NULL DEFAULT 'hsl(222, 60%, 18%)'::text,
  programme_count integer NOT NULL DEFAULT 0,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  archived_at timestamp with time zone,
  archived_by uuid,
  PRIMARY KEY (id)
);

CREATE TABLE public.programmes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  programme_type_id uuid,
  country_id uuid,
  qualification_framework_id uuid,
  nqf_level integer,
  credits integer,
  duration_months integer,
  status text NOT NULL DEFAULT 'draft'::text,
  theory_percentage integer DEFAULT 50,
  workplace_percentage integer DEFAULT 50,
  manager_id uuid,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  version text NOT NULL DEFAULT 'v1.0'::text,
  ai_content_enabled boolean NOT NULL DEFAULT true,
  tenant_id uuid,
  cost_per_learner numeric,
  archived_at timestamp with time zone,
  archived_by uuid,
  PRIMARY KEY (id)
);

CREATE TABLE public.qualification_frameworks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  country_id uuid NOT NULL,
  name text NOT NULL,
  acronym varchar(20) NOT NULL,
  description text,
  total_levels integer NOT NULL DEFAULT 10,
  regional_alignment text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.qualification_levels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  framework_id uuid NOT NULL,
  level_number integer NOT NULL,
  level_name text NOT NULL,
  descriptor text,
  credit_range text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.question_bank_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bank_id uuid NOT NULL,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'multiple_choice'::text,
  points integer NOT NULL DEFAULT 1,
  difficulty_level text DEFAULT 'medium'::text,
  explanation text,
  options jsonb DEFAULT '[]'::jsonb,
  matching_pairs jsonb,
  ordering_items jsonb,
  fill_blanks jsonb,
  likert_config jsonb,
  tags text[] DEFAULT '{}'::text[],
  learning_outcome_ids uuid[] DEFAULT '{}'::uuid[],
  created_by uuid DEFAULT auth.uid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.question_banks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  programme_id uuid,
  folder_path text DEFAULT '/'::text,
  created_by uuid DEFAULT auth.uid(),
  is_shared boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.quiz_options (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL,
  option_text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  sequence_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.quiz_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'multiple_choice'::text,
  points numeric NOT NULL DEFAULT 1,
  sequence_order integer NOT NULL DEFAULT 0,
  explanation text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.quiz_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL,
  question_id uuid NOT NULL,
  selected_option_id uuid,
  text_answer text,
  is_correct boolean,
  points_earned numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.registration_approval_steps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL,
  step_order integer NOT NULL DEFAULT 1,
  approver_user_id uuid,
  approver_role text,
  status text NOT NULL DEFAULT 'pending'::text,
  reason text,
  decided_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.regulatory_bodies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  country_id uuid NOT NULL,
  name text NOT NULL,
  acronym varchar(20) NOT NULL,
  body_type text NOT NULL,
  website_url text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.reporting_mandates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  framework_id uuid NOT NULL,
  report_name text NOT NULL,
  acronym varchar(20),
  description text,
  frequency text NOT NULL,
  submission_body_id uuid,
  template_format text,
  is_mandatory boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.role_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  performed_by uuid,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.role_definitions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  role_key text NOT NULL,
  display_name text NOT NULL,
  description text,
  domain text NOT NULL,
  base_role public.app_role,
  is_predefined boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  template_source_id uuid,
  dashboard_path text,
  portal_title text,
  portal_subtitle text,
  menu_config jsonb DEFAULT '[]'::jsonb,
  widget_config jsonb DEFAULT '[]'::jsonb,
  permissions jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.role_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  role_definition_id uuid NOT NULL,
  resource text NOT NULL,
  action text NOT NULL,
  is_granted boolean NOT NULL DEFAULT true,
  conditions jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.rubric_criteria (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  rubric_id uuid NOT NULL,
  criterion_name text NOT NULL,
  description text,
  max_points numeric NOT NULL DEFAULT 10,
  sequence_order integer NOT NULL DEFAULT 0,
  performance_levels jsonb NOT NULL DEFAULT '[{"level": "Excellent", "points": 10, "description": ""}, {"level": "Good", "points": 7, "description": ""}, {"level": "Satisfactory", "points": 5, "description": ""}, {"level": "Needs Improvement", "points": 2, "description": ""}]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.rubrics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  rubric_type text NOT NULL DEFAULT 'analytic'::text,
  programme_id uuid,
  max_score numeric,
  is_reusable boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.security_incidents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'medium'::text,
  status text NOT NULL DEFAULT 'open'::text,
  category text NOT NULL DEFAULT 'other'::text,
  reported_by uuid NOT NULL,
  assigned_to uuid,
  detected_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  resolution_notes text,
  affected_systems text,
  affected_users_count integer DEFAULT 0,
  root_cause text,
  corrective_actions text,
  preventive_actions text,
  data_breach boolean NOT NULL DEFAULT false,
  regulator_notified boolean NOT NULL DEFAULT false,
  regulator_notified_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.session_attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  learner_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'absent'::text,
  check_in_method text,
  checked_in_at timestamp with time zone,
  checked_out_at timestamp with time zone,
  duration_minutes integer,
  notes text,
  marked_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  qr_token text,
  late_minutes integer DEFAULT 0,
  PRIMARY KEY (id)
);

CREATE TABLE public.session_chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  message text NOT NULL,
  message_type text NOT NULL DEFAULT 'text'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.session_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  author_id uuid NOT NULL,
  content text NOT NULL DEFAULT ''::text,
  note_type text NOT NULL DEFAULT 'note'::text,
  is_shared boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.shared_content_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  content_type text NOT NULL DEFAULT 'lesson'::text,
  content jsonb DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft'::text,
  tags text[] DEFAULT '{}'::text[],
  created_by uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.shared_content_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL,
  version_number integer NOT NULL,
  content jsonb DEFAULT '{}'::jsonb,
  change_reason text,
  changed_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.skills (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general'::text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.sponsor_compliance_evidence (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL,
  evidence_type text NOT NULL DEFAULT 'document'::text,
  title text NOT NULL,
  description text,
  file_path text,
  external_url text,
  reference_table text,
  reference_id uuid,
  uploaded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.sponsor_compliance_frameworks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  country_id uuid NOT NULL,
  framework_code text NOT NULL,
  framework_name text NOT NULL,
  description text,
  version text NOT NULL DEFAULT '1.0'::text,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  beneficiary_categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  scoring_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.sponsor_compliance_indicators (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  framework_id uuid NOT NULL,
  category text NOT NULL,
  indicator_code text NOT NULL,
  indicator_name text NOT NULL,
  description text,
  unit text NOT NULL DEFAULT 'ZAR'::text,
  max_points numeric NOT NULL DEFAULT 0,
  target_value numeric,
  is_auto_captured boolean NOT NULL DEFAULT false,
  data_source text,
  sequence_order integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.sponsor_compliance_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  framework_id uuid NOT NULL,
  indicator_id uuid NOT NULL,
  sponsor_id uuid NOT NULL,
  reporting_period_start date NOT NULL,
  reporting_period_end date NOT NULL,
  target_value numeric NOT NULL DEFAULT 0,
  actual_value numeric NOT NULL DEFAULT 0,
  calculated_score numeric NOT NULL DEFAULT 0,
  score_capped boolean NOT NULL DEFAULT false,
  beneficiary_breakdown jsonb DEFAULT '{}'::jsonb,
  notes text,
  last_calculated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.sponsor_compliance_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  framework_id uuid NOT NULL,
  sponsor_id uuid NOT NULL,
  reporting_period_start date NOT NULL,
  reporting_period_end date NOT NULL,
  report_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_sd_score numeric DEFAULT 0,
  total_ed_score numeric DEFAULT 0,
  bbbee_level text,
  status text NOT NULL DEFAULT 'draft'::text,
  approved_by uuid,
  approved_at timestamp with time zone,
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  file_path text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.sponsor_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  company_name text NOT NULL,
  invited_by uuid NOT NULL,
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'::text),
  status text NOT NULL DEFAULT 'pending'::text,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + '7 days'::interval),
  accepted_at timestamp with time zone,
  programme_ids uuid[] DEFAULT '{}'::uuid[],
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.sponsor_invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sponsor_id uuid NOT NULL,
  programme_id uuid,
  cohort_id uuid,
  invoice_number text NOT NULL,
  description text,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ZAR'::text,
  status text NOT NULL DEFAULT 'draft'::text,
  issued_date date,
  due_date date,
  paid_date date,
  payment_reference text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  country_id uuid,
  framework_id uuid,
  programme_type_id uuid,
  funding_type text,
  claim_reference text,
  quote_id uuid,
  learner_count integer,
  cost_per_learner numeric,
  PRIMARY KEY (id)
);

CREATE TABLE public.sponsor_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamp with time zone,
  parent_message_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.sponsor_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
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
  country_id uuid,
  status text NOT NULL DEFAULT 'pending_approval'::text,
  approved_by uuid,
  approved_at timestamp with time zone,
  rejection_reason text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.sponsor_programme_links (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sponsor_id uuid NOT NULL,
  link_type text NOT NULL DEFAULT 'programme'::text,
  programme_id uuid,
  cohort_id uuid,
  enrolment_id uuid,
  funding_amount numeric,
  funding_currency text DEFAULT 'ZAR'::text,
  contract_reference text,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'active'::text,
  created_by uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.sponsor_quotes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  quote_number text NOT NULL,
  sponsor_id uuid NOT NULL,
  programme_id uuid,
  programme_type_id uuid,
  country_id uuid,
  cohort_id uuid,
  cost_per_learner numeric NOT NULL DEFAULT 0,
  learner_count integer NOT NULL DEFAULT 1,
  total_amount numeric,
  currency text NOT NULL DEFAULT 'ZAR'::text,
  status text NOT NULL DEFAULT 'draft'::text,
  valid_until date,
  notes text,
  created_by uuid,
  accepted_at timestamp with time zone,
  accepted_by uuid,
  rejected_at timestamp with time zone,
  rejection_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  revision_notes text,
  PRIMARY KEY (id)
);

CREATE TABLE public.sponsor_sd_expenditures (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  sponsor_id uuid NOT NULL,
  category text NOT NULL,
  description text,
  amount numeric NOT NULL DEFAULT 0,
  beneficiary_type text,
  is_accredited boolean NOT NULL DEFAULT false,
  evidence_reference text,
  expenditure_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  learner_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE public.sponsor_sd_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sponsor_id uuid NOT NULL,
  financial_year text NOT NULL,
  scorecard_type text NOT NULL DEFAULT 'generic'::text,
  annual_leviable_amount numeric NOT NULL DEFAULT 0,
  target_percentage numeric NOT NULL DEFAULT 6,
  calculated_target numeric,
  sub_minimum_percentage numeric NOT NULL DEFAULT 40,
  admin_cap_percentage numeric NOT NULL DEFAULT 15,
  informal_cap_percentage numeric NOT NULL DEFAULT 25,
  travel_cap_percentage numeric NOT NULL DEFAULT 15,
  wsp_submitted boolean NOT NULL DEFAULT false,
  atr_submitted boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.sponsor_seta_checklist (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sponsor_id uuid NOT NULL,
  financial_year text NOT NULL,
  check_key text NOT NULL,
  check_label text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  completed_by uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.staff_document_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL,
  requested_by uuid,
  document_types text[] NOT NULL DEFAULT '{}'::text[],
  message text,
  secure_upload_token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'::text),
  status text NOT NULL DEFAULT 'pending'::text,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + '7 days'::interval),
  fulfilled_at timestamp with time zone,
  reminder_count integer NOT NULL DEFAULT 0,
  last_reminder_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.staff_registrations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  role_requested text NOT NULL,
  department text,
  status text NOT NULL DEFAULT 'pending_verification'::text,
  documents jsonb DEFAULT '{}'::jsonb,
  document_verification_status text NOT NULL DEFAULT 'pending'::text,
  document_verified_by uuid,
  document_verified_at timestamp with time zone,
  rejection_reason text,
  notes text,
  registered_by uuid,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  approved_at timestamp with time zone,
  approved_by uuid,
  portal_access_granted boolean DEFAULT false,
  credentials_sent boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.staff_role_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  staff_registration_id uuid NOT NULL,
  role_name text NOT NULL,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  assigned_by uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.staff_verification_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL,
  section text NOT NULL,
  check_name text NOT NULL,
  check_label text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  verified_by uuid,
  verified_at timestamp with time zone,
  notes text,
  evidence_document_id uuid,
  is_required boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  setting_key text NOT NULL,
  setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.tenant_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  performed_by uuid,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.tenant_feature_flags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  flag_key text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.tenant_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member'::text,
  is_active boolean NOT NULL DEFAULT true,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.tenants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  domain text,
  logo_url text,
  favicon_url text,
  primary_color text DEFAULT '#6366f1'::text,
  secondary_color text DEFAULT '#8b5cf6'::text,
  status text NOT NULL DEFAULT 'active'::text,
  settings jsonb DEFAULT '{}'::jsonb,
  max_users integer,
  max_programmes integer,
  subscription_tier text DEFAULT 'standard'::text,
  contact_email text,
  contact_phone text,
  address text,
  country text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.training_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cohort_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  session_type text NOT NULL DEFAULT 'live'::text,
  scheduled_start timestamp with time zone NOT NULL,
  scheduled_end timestamp with time zone NOT NULL,
  recurrence_rule text,
  recurrence_parent_id uuid,
  jitsi_room_id text NOT NULL DEFAULT (gen_random_uuid())::text,
  meeting_url text,
  status text NOT NULL DEFAULT 'scheduled'::text,
  created_by uuid NOT NULL,
  facilitator_id uuid,
  max_duration_minutes integer DEFAULT 60,
  recording_url text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  agenda jsonb DEFAULT '[]'::jsonb,
  meeting_config jsonb DEFAULT '{}'::jsonb,
  actual_start timestamp with time zone,
  actual_end timestamp with time zone,
  tenant_id uuid,
  qr_checkin_enabled boolean DEFAULT false,
  qr_token text DEFAULT encode(extensions.gen_random_bytes(16), 'hex'::text),
  PRIMARY KEY (id)
);

CREATE TABLE public.typography_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  is_draft boolean NOT NULL DEFAULT true,
  element_group text NOT NULL,
  font_family text NOT NULL,
  font_source text NOT NULL DEFAULT 'google'::text,
  loaded_variants jsonb NOT NULL DEFAULT '["400", "700"]'::jsonb,
  desktop_settings jsonb NOT NULL DEFAULT '{"fontSize": "16px", "lineHeight": "1.5", "wordSpacing": "0", "letterSpacing": "0", "textTransform": "none"}'::jsonb,
  tablet_settings jsonb NOT NULL DEFAULT '{"fontSize": "15px", "lineHeight": "1.5", "wordSpacing": "0", "letterSpacing": "0", "textTransform": "none"}'::jsonb,
  mobile_settings jsonb NOT NULL DEFAULT '{"fontSize": "14px", "lineHeight": "1.4", "wordSpacing": "0", "letterSpacing": "0", "textTransform": "none"}'::jsonb,
  font_weight text DEFAULT '400'::text,
  font_style text DEFAULT 'normal'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid,
  PRIMARY KEY (id)
);

CREATE TABLE public.typography_presets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  preset_name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'custom'::text,
  assignments jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  PRIMARY KEY (id)
);

CREATE TABLE public.user_generated_content (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  content_type text NOT NULL DEFAULT 'document'::text,
  content_url text,
  file_path text,
  thumbnail_url text,
  status text NOT NULL DEFAULT 'pending'::text,
  moderation_notes text,
  moderated_by uuid,
  moderated_at timestamp with time zone,
  published_at timestamp with time zone,
  relevance_score integer,
  accuracy_verified boolean NOT NULL DEFAULT false,
  tags text[] DEFAULT '{}'::text[],
  view_count integer NOT NULL DEFAULT 0,
  programme_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.user_role_scopes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role_definition_id uuid NOT NULL,
  scope_type text NOT NULL,
  scope_value uuid,
  scope_label text,
  assigned_by uuid,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.verification_checklist_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL,
  section text NOT NULL,
  check_name text NOT NULL,
  check_label text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  verified_by uuid,
  verified_at timestamp with time zone,
  notes text,
  evidence_document_id uuid,
  is_required boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.workflow_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  instance_id uuid,
  step_instance_id uuid,
  action text NOT NULL,
  performed_by uuid,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.workflow_instances (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  current_step_id uuid,
  status text NOT NULL DEFAULT 'active'::text,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  started_by uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.workflow_step_instances (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL,
  step_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  assigned_to uuid,
  assigned_role text,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  completed_by uuid,
  outcome text,
  reason text,
  result_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.workflow_steps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL,
  step_name text NOT NULL,
  step_type text NOT NULL DEFAULT 'approval'::text,
  step_order integer NOT NULL DEFAULT 1,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  next_step_on_approve uuid,
  next_step_on_reject uuid,
  is_required boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.workflow_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  entity_type text NOT NULL DEFAULT 'learner_registration'::text,
  trigger_event text NOT NULL DEFAULT 'on_create'::text,
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  scope_type text NOT NULL DEFAULT 'global'::text,
  scope_id uuid,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.workplace_evidence (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL,
  enrolment_id uuid,
  title text NOT NULL,
  description text,
  evidence_type text NOT NULL DEFAULT 'document'::text,
  file_url text,
  status text NOT NULL DEFAULT 'pending'::text,
  submitted_at timestamp with time zone DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- ── UNIQUE CONSTRAINTS ─────────────────────────────────────
ALTER TABLE public.announcement_reads ADD CONSTRAINT announcement_reads_announcement_id_user_id_key UNIQUE (announcement_id, user_id);
ALTER TABLE public.assessment_links ADD CONSTRAINT assessment_links_assessment_id_pathway_id_module_id_lesson__key UNIQUE (assessment_id, pathway_id, module_id, lesson_id);
ALTER TABLE public.assessment_rubrics ADD CONSTRAINT assessment_rubrics_assessment_id_rubric_id_key UNIQUE (assessment_id, rubric_id);
ALTER TABLE public.assessment_settings ADD CONSTRAINT assessment_settings_assessment_id_key UNIQUE (assessment_id);
ALTER TABLE public.assessor_report_templates ADD CONSTRAINT assessor_report_templates_scope_level_programme_id_key UNIQUE (scope_level, programme_id);
ALTER TABLE public.cms_menus ADD CONSTRAINT cms_menus_slug_key UNIQUE (slug);
ALTER TABLE public.cms_pages ADD CONSTRAINT cms_pages_slug_key UNIQUE (slug);
ALTER TABLE public.cohort_staff_assignments ADD CONSTRAINT cohort_staff_assignments_cohort_id_user_id_role_key UNIQUE (cohort_id, user_id, role);
ALTER TABLE public.content_prerequisites ADD CONSTRAINT content_prerequisites_content_block_id_prerequisite_block_i_key UNIQUE (content_block_id, prerequisite_block_id);
ALTER TABLE public.countries ADD CONSTRAINT countries_iso_code_key UNIQUE (iso_code);
ALTER TABLE public.country_regulatory_frameworks ADD CONSTRAINT country_regulatory_frameworks_country_id_version_key UNIQUE (country_id, version);
ALTER TABLE public.directory_oversight_settings ADD CONSTRAINT directory_oversight_settings_target_role_feature_key_key UNIQUE (target_role, feature_key);
ALTER TABLE public.enrolment_toggles ADD CONSTRAINT enrolment_toggles_scope_level_scope_id_key UNIQUE (scope_level, scope_id);
ALTER TABLE public.enrolments ADD CONSTRAINT enrolments_cohort_id_learner_id_key UNIQUE (cohort_id, learner_id);
ALTER TABLE public.feature_flags ADD CONSTRAINT feature_flags_flag_key_key UNIQUE (flag_key);
ALTER TABLE public.font_library ADD CONSTRAINT font_library_font_source_family_name_key UNIQUE (font_source, family_name);
ALTER TABLE public.learner_badges ADD CONSTRAINT learner_badges_learner_id_badge_id_key UNIQUE (learner_id, badge_id);
ALTER TABLE public.learner_bookmarks ADD CONSTRAINT learner_bookmarks_learner_id_content_block_id_enrolment_id_key UNIQUE (learner_id, content_block_id, enrolment_id);
ALTER TABLE public.learner_content_progress ADD CONSTRAINT learner_content_progress_learner_id_content_block_id_enrolm_key UNIQUE (learner_id, content_block_id, enrolment_id);
ALTER TABLE public.learner_eligibility_checks ADD CONSTRAINT learner_eligibility_checks_registration_id_check_type_key UNIQUE (registration_id, check_type);
ALTER TABLE public.learner_skill_profiles ADD CONSTRAINT learner_skill_profiles_learner_id_skill_id_key UNIQUE (learner_id, skill_id);
ALTER TABLE public.meeting_participants ADD CONSTRAINT meeting_participants_session_id_user_id_key UNIQUE (session_id, user_id);
ALTER TABLE public.module_prerequisites ADD CONSTRAINT module_prerequisites_module_id_prerequisite_module_id_key UNIQUE (module_id, prerequisite_module_id);
ALTER TABLE public.notification_preferences ADD CONSTRAINT notification_preferences_user_id_category_key UNIQUE (user_id, category);
ALTER TABLE public.payment_gateways ADD CONSTRAINT payment_gateways_gateway_key_key UNIQUE (gateway_key);
ALTER TABLE public.platform_settings ADD CONSTRAINT platform_settings_setting_key_key UNIQUE (setting_key);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
ALTER TABLE public.programme_assessment_config ADD CONSTRAINT programme_assessment_config_programme_id_assessment_type_key UNIQUE (programme_id, assessment_type);
ALTER TABLE public.programme_completion_config ADD CONSTRAINT programme_completion_config_programme_id_key UNIQUE (programme_id);
ALTER TABLE public.programme_enrolment_config ADD CONSTRAINT programme_enrolment_config_programme_id_key UNIQUE (programme_id);
ALTER TABLE public.programme_type_country_mappings ADD CONSTRAINT programme_type_country_mappin_programme_type_name_country_i_key UNIQUE (programme_type_name, country_id);
ALTER TABLE public.qualification_levels ADD CONSTRAINT qualification_levels_framework_id_level_number_key UNIQUE (framework_id, level_number);
ALTER TABLE public.role_definitions ADD CONSTRAINT role_definitions_role_key_key UNIQUE (role_key);
ALTER TABLE public.role_permissions ADD CONSTRAINT role_permissions_role_definition_id_resource_action_key UNIQUE (role_definition_id, resource, action);
ALTER TABLE public.session_attendance ADD CONSTRAINT session_attendance_session_id_learner_id_key UNIQUE (session_id, learner_id);
ALTER TABLE public.shared_content_versions ADD CONSTRAINT shared_content_versions_item_id_version_number_key UNIQUE (item_id, version_number);
ALTER TABLE public.skills ADD CONSTRAINT skills_name_key UNIQUE (name);
ALTER TABLE public.sponsor_compliance_frameworks ADD CONSTRAINT sponsor_compliance_frameworks_country_id_framework_code_ver_key UNIQUE (country_id, framework_code, version);
ALTER TABLE public.sponsor_compliance_indicators ADD CONSTRAINT sponsor_compliance_indicators_framework_id_indicator_code_key UNIQUE (framework_id, indicator_code);
ALTER TABLE public.sponsor_compliance_records ADD CONSTRAINT sponsor_compliance_records_indicator_id_sponsor_id_reportin_key UNIQUE (indicator_id, sponsor_id, reporting_period_start);
ALTER TABLE public.sponsor_profiles ADD CONSTRAINT sponsor_profiles_user_id_key UNIQUE (user_id);
ALTER TABLE public.sponsor_sd_profiles ADD CONSTRAINT sponsor_sd_profiles_sponsor_id_financial_year_key UNIQUE (sponsor_id, financial_year);
ALTER TABLE public.sponsor_seta_checklist ADD CONSTRAINT sponsor_seta_checklist_sponsor_id_financial_year_check_key_key UNIQUE (sponsor_id, financial_year, check_key);
ALTER TABLE public.staff_role_assignments ADD CONSTRAINT staff_role_assignments_staff_registration_id_role_name_key UNIQUE (staff_registration_id, role_name);
ALTER TABLE public.staff_verification_items ADD CONSTRAINT staff_verification_items_registration_id_check_name_key UNIQUE (registration_id, check_name);
ALTER TABLE public.system_settings ADD CONSTRAINT system_settings_setting_key_key UNIQUE (setting_key);
ALTER TABLE public.tenant_feature_flags ADD CONSTRAINT tenant_feature_flags_tenant_id_flag_key_key UNIQUE (tenant_id, flag_key);
ALTER TABLE public.tenant_users ADD CONSTRAINT tenant_users_tenant_id_user_id_key UNIQUE (tenant_id, user_id);
ALTER TABLE public.tenants ADD CONSTRAINT tenants_domain_key UNIQUE (domain);
ALTER TABLE public.tenants ADD CONSTRAINT tenants_slug_key UNIQUE (slug);
ALTER TABLE public.typography_assignments ADD CONSTRAINT typography_assignments_is_draft_element_group_key UNIQUE (is_draft, element_group);
ALTER TABLE public.typography_presets ADD CONSTRAINT typography_presets_preset_name_key UNIQUE (preset_name);
ALTER TABLE public.user_role_scopes ADD CONSTRAINT user_role_scopes_user_id_role_definition_id_scope_type_scop_key UNIQUE (user_id, role_definition_id, scope_type, scope_value);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
ALTER TABLE public.verification_checklist_items ADD CONSTRAINT verification_checklist_items_registration_id_section_check__key UNIQUE (registration_id, section, check_name);

-- ── FOREIGN KEYS ──────────────────────────────────────────
ALTER TABLE public.announcement_reads ADD CONSTRAINT announcement_reads_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE;
ALTER TABLE public.announcements ADD CONSTRAINT announcements_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;
ALTER TABLE public.assessment_links ADD CONSTRAINT assessment_links_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE;
ALTER TABLE public.assessment_links ADD CONSTRAINT assessment_links_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE;
ALTER TABLE public.assessment_links ADD CONSTRAINT assessment_links_module_id_fkey FOREIGN KEY (module_id) REFERENCES programme_modules(id) ON DELETE CASCADE;
ALTER TABLE public.assessment_links ADD CONSTRAINT assessment_links_pathway_id_fkey FOREIGN KEY (pathway_id) REFERENCES pathways(id) ON DELETE CASCADE;
ALTER TABLE public.assessment_rubrics ADD CONSTRAINT assessment_rubrics_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE;
ALTER TABLE public.assessment_rubrics ADD CONSTRAINT assessment_rubrics_rubric_id_fkey FOREIGN KEY (rubric_id) REFERENCES rubrics(id) ON DELETE CASCADE;
ALTER TABLE public.assessment_settings ADD CONSTRAINT assessment_settings_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE;
ALTER TABLE public.assessment_submissions ADD CONSTRAINT assessment_submissions_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE;
ALTER TABLE public.assessment_submissions ADD CONSTRAINT assessment_submissions_enrolment_id_fkey FOREIGN KEY (enrolment_id) REFERENCES enrolments(id);
ALTER TABLE public.assessments ADD CONSTRAINT assessments_module_id_fkey FOREIGN KEY (module_id) REFERENCES programme_modules(id) ON DELETE CASCADE;
ALTER TABLE public.assessments ADD CONSTRAINT assessments_programme_id_fkey FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE CASCADE;
ALTER TABLE public.assessor_report_template_versions ADD CONSTRAINT assessor_report_template_versions_template_id_fkey FOREIGN KEY (template_id) REFERENCES assessor_report_templates(id) ON DELETE CASCADE;
ALTER TABLE public.assessor_report_templates ADD CONSTRAINT assessor_report_templates_programme_id_fkey FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE CASCADE;
ALTER TABLE public.assessor_reports ADD CONSTRAINT assessor_reports_cohort_id_fkey FOREIGN KEY (cohort_id) REFERENCES cohorts(id) ON DELETE SET NULL;
ALTER TABLE public.assessor_reports ADD CONSTRAINT assessor_reports_programme_id_fkey FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE CASCADE;
ALTER TABLE public.audit_findings ADD CONSTRAINT audit_findings_audit_id_fkey FOREIGN KEY (audit_id) REFERENCES internal_audits(id) ON DELETE CASCADE;
ALTER TABLE public.certificate_templates ADD CONSTRAINT certificate_templates_programme_id_fkey FOREIGN KEY (programme_id) REFERENCES programmes(id);
ALTER TABLE public.certificate_templates ADD CONSTRAINT certificate_templates_programme_type_id_fkey FOREIGN KEY (programme_type_id) REFERENCES programme_types(id);
ALTER TABLE public.challenge_exam_attempts ADD CONSTRAINT challenge_exam_attempts_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES challenge_exams(id) ON DELETE CASCADE;
ALTER TABLE public.challenge_exam_attempts ADD CONSTRAINT challenge_exam_attempts_learner_id_fkey FOREIGN KEY (learner_id) REFERENCES auth.users(id);
ALTER TABLE public.challenge_exams ADD CONSTRAINT challenge_exams_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.challenge_exams ADD CONSTRAINT challenge_exams_programme_id_fkey FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE CASCADE;
ALTER TABLE public.cms_menu_items ADD CONSTRAINT cms_menu_items_menu_id_fkey FOREIGN KEY (menu_id) REFERENCES cms_menus(id) ON DELETE CASCADE;
ALTER TABLE public.cms_menu_items ADD CONSTRAINT cms_menu_items_page_id_fkey FOREIGN KEY (page_id) REFERENCES cms_pages(id) ON DELETE SET NULL;
ALTER TABLE public.cms_menu_items ADD CONSTRAINT cms_menu_items_parent_item_id_fkey FOREIGN KEY (parent_item_id) REFERENCES cms_menu_items(id) ON DELETE CASCADE;
ALTER TABLE public.cms_menus ADD CONSTRAINT cms_menus_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.cms_page_blocks ADD CONSTRAINT cms_page_blocks_page_id_fkey FOREIGN KEY (page_id) REFERENCES cms_pages(id) ON DELETE CASCADE;
ALTER TABLE public.cms_pages ADD CONSTRAINT cms_pages_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.cms_role_menu_permissions ADD CONSTRAINT cms_role_menu_permissions_menu_id_fkey FOREIGN KEY (menu_id) REFERENCES cms_menus(id) ON DELETE CASCADE;
ALTER TABLE public.cms_role_menu_permissions ADD CONSTRAINT cms_role_menu_permissions_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES cms_menu_items(id) ON DELETE CASCADE;
ALTER TABLE public.cohort_staff_assignments ADD CONSTRAINT cohort_staff_assignments_cohort_id_fkey FOREIGN KEY (cohort_id) REFERENCES cohorts(id) ON DELETE CASCADE;
ALTER TABLE public.cohorts ADD CONSTRAINT cohorts_programme_id_fkey FOREIGN KEY (programme_id) REFERENCES programmes(id);
ALTER TABLE public.cohorts ADD CONSTRAINT cohorts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;
ALTER TABLE public.compliance_requirements ADD CONSTRAINT compliance_requirements_mapping_id_fkey FOREIGN KEY (mapping_id) REFERENCES programme_type_country_mappings(id) ON DELETE CASCADE;
ALTER TABLE public.compliance_requirements ADD CONSTRAINT compliance_requirements_responsible_body_id_fkey FOREIGN KEY (responsible_body_id) REFERENCES regulatory_bodies(id);
ALTER TABLE public.content_blocks ADD CONSTRAINT content_blocks_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL;
ALTER TABLE public.content_blocks ADD CONSTRAINT content_blocks_module_id_fkey FOREIGN KEY (module_id) REFERENCES programme_modules(id) ON DELETE CASCADE;
ALTER TABLE public.content_comments ADD CONSTRAINT content_comments_content_block_id_fkey FOREIGN KEY (content_block_id) REFERENCES content_blocks(id) ON DELETE CASCADE;
ALTER TABLE public.content_comments ADD CONSTRAINT content_comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES content_comments(id) ON DELETE CASCADE;
ALTER TABLE public.content_comments ADD CONSTRAINT content_comments_ugc_id_fkey FOREIGN KEY (ugc_id) REFERENCES user_generated_content(id) ON DELETE CASCADE;
ALTER TABLE public.content_prerequisites ADD CONSTRAINT content_prerequisites_content_block_id_fkey FOREIGN KEY (content_block_id) REFERENCES content_blocks(id) ON DELETE CASCADE;
ALTER TABLE public.content_prerequisites ADD CONSTRAINT content_prerequisites_prerequisite_block_id_fkey FOREIGN KEY (prerequisite_block_id) REFERENCES content_blocks(id) ON DELETE CASCADE;
ALTER TABLE public.content_ratings ADD CONSTRAINT content_ratings_content_block_id_fkey FOREIGN KEY (content_block_id) REFERENCES content_blocks(id) ON DELETE CASCADE;
ALTER TABLE public.content_ratings ADD CONSTRAINT content_ratings_ugc_id_fkey FOREIGN KEY (ugc_id) REFERENCES user_generated_content(id) ON DELETE CASCADE;
ALTER TABLE public.content_skill_tags ADD CONSTRAINT content_skill_tags_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE;
ALTER TABLE public.content_skill_tags ADD CONSTRAINT content_skill_tags_content_block_id_fkey FOREIGN KEY (content_block_id) REFERENCES content_blocks(id) ON DELETE CASCADE;
ALTER TABLE public.content_skill_tags ADD CONSTRAINT content_skill_tags_programme_id_fkey FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE CASCADE;
ALTER TABLE public.content_skill_tags ADD CONSTRAINT content_skill_tags_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE;
ALTER TABLE public.country_regulatory_frameworks ADD CONSTRAINT country_regulatory_frameworks_country_id_fkey FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE;
ALTER TABLE public.course_content_links ADD CONSTRAINT course_content_links_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE;
ALTER TABLE public.course_content_links ADD CONSTRAINT course_content_links_module_id_fkey FOREIGN KEY (module_id) REFERENCES programme_modules(id) ON DELETE CASCADE;
ALTER TABLE public.course_content_links ADD CONSTRAINT course_content_links_programme_id_fkey FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE CASCADE;
ALTER TABLE public.course_content_links ADD CONSTRAINT course_content_links_shared_item_id_fkey FOREIGN KEY (shared_item_id) REFERENCES shared_content_items(id) ON DELETE CASCADE;
ALTER TABLE public.discussion_posts ADD CONSTRAINT discussion_posts_parent_post_id_fkey FOREIGN KEY (parent_post_id) REFERENCES discussion_posts(id) ON DELETE SET NULL;
ALTER TABLE public.discussion_posts ADD CONSTRAINT discussion_posts_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES discussion_threads(id) ON DELETE CASCADE;
ALTER TABLE public.document_requests ADD CONSTRAINT document_requests_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES learner_registrations(id) ON DELETE CASCADE;
ALTER TABLE public.drip_schedules ADD CONSTRAINT drip_schedules_content_block_id_fkey FOREIGN KEY (content_block_id) REFERENCES content_blocks(id) ON DELETE CASCADE;
ALTER TABLE public.drip_schedules ADD CONSTRAINT drip_schedules_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE;
ALTER TABLE public.drip_schedules ADD CONSTRAINT drip_schedules_module_id_fkey FOREIGN KEY (module_id) REFERENCES programme_modules(id) ON DELETE CASCADE;
ALTER TABLE public.drip_schedules ADD CONSTRAINT drip_schedules_programme_id_fkey FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE CASCADE;
ALTER TABLE public.enrolments ADD CONSTRAINT enrolments_cohort_id_fkey FOREIGN KEY (cohort_id) REFERENCES cohorts(id) ON DELETE SET NULL;
ALTER TABLE public.enrolments ADD CONSTRAINT enrolments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;
ALTER TABLE public.external_content_items ADD CONSTRAINT external_content_items_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES external_content_providers(id) ON DELETE CASCADE;
ALTER TABLE public.funding_rules ADD CONSTRAINT funding_rules_framework_id_fkey FOREIGN KEY (framework_id) REFERENCES country_regulatory_frameworks(id) ON DELETE CASCADE;
ALTER TABLE public.incentive_schemes ADD CONSTRAINT incentive_schemes_country_id_fkey FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE;
ALTER TABLE public.issued_credentials ADD CONSTRAINT issued_credentials_enrolment_id_fkey FOREIGN KEY (enrolment_id) REFERENCES enrolments(id);
ALTER TABLE public.issued_credentials ADD CONSTRAINT issued_credentials_programme_id_fkey FOREIGN KEY (programme_id) REFERENCES programmes(id);
ALTER TABLE public.learner_badges ADD CONSTRAINT learner_badges_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE;
ALTER TABLE public.learner_badges ADD CONSTRAINT learner_badges_enrolment_id_fkey FOREIGN KEY (enrolment_id) REFERENCES enrolments(id);
ALTER TABLE public.learner_bookmarks ADD CONSTRAINT learner_bookmarks_content_block_id_fkey FOREIGN KEY (content_block_id) REFERENCES content_blocks(id) ON DELETE CASCADE;
ALTER TABLE public.learner_bookmarks ADD CONSTRAINT learner_bookmarks_enrolment_id_fkey FOREIGN KEY (enrolment_id) REFERENCES enrolments(id) ON DELETE CASCADE;
ALTER TABLE public.learner_content_progress ADD CONSTRAINT learner_content_progress_content_block_id_fkey FOREIGN KEY (content_block_id) REFERENCES content_blocks(id) ON DELETE CASCADE;
ALTER TABLE public.learner_content_progress ADD CONSTRAINT learner_content_progress_enrolment_id_fkey FOREIGN KEY (enrolment_id) REFERENCES enrolments(id) ON DELETE CASCADE;
ALTER TABLE public.learner_content_progress ADD CONSTRAINT learner_content_progress_module_id_fkey FOREIGN KEY (module_id) REFERENCES programme_modules(id) ON DELETE CASCADE;
ALTER TABLE public.learner_documents ADD CONSTRAINT learner_documents_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES learner_registrations(id) ON DELETE CASCADE;
ALTER TABLE public.learner_eligibility_checks ADD CONSTRAINT learner_eligibility_checks_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES learner_registrations(id) ON DELETE CASCADE;
ALTER TABLE public.learner_notes ADD CONSTRAINT learner_notes_content_block_id_fkey FOREIGN KEY (content_block_id) REFERENCES content_blocks(id) ON DELETE CASCADE;
ALTER TABLE public.learner_notes ADD CONSTRAINT learner_notes_enrolment_id_fkey FOREIGN KEY (enrolment_id) REFERENCES enrolments(id) ON DELETE CASCADE;
ALTER TABLE public.learner_notes ADD CONSTRAINT learner_notes_module_id_fkey FOREIGN KEY (module_id) REFERENCES programme_modules(id) ON DELETE CASCADE;
ALTER TABLE public.learner_points ADD CONSTRAINT learner_points_enrolment_id_fkey FOREIGN KEY (enrolment_id) REFERENCES enrolments(id);
ALTER TABLE public.learner_registrations ADD CONSTRAINT learner_registrations_programme_id_fkey FOREIGN KEY (programme_id) REFERENCES programmes(id);
ALTER TABLE public.learner_registrations ADD CONSTRAINT learner_registrations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;
ALTER TABLE public.learner_skill_profiles ADD CONSTRAINT learner_skill_profiles_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE;
ALTER TABLE public.learning_recommendations ADD CONSTRAINT learning_recommendations_content_block_id_fkey FOREIGN KEY (content_block_id) REFERENCES content_blocks(id) ON DELETE CASCADE;
ALTER TABLE public.learning_recommendations ADD CONSTRAINT learning_recommendations_programme_id_fkey FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE CASCADE;
ALTER TABLE public.learning_recommendations ADD CONSTRAINT learning_recommendations_ugc_id_fkey FOREIGN KEY (ugc_id) REFERENCES user_generated_content(id) ON DELETE CASCADE;
ALTER TABLE public.lessons ADD CONSTRAINT lessons_module_id_fkey FOREIGN KEY (module_id) REFERENCES programme_modules(id) ON DELETE CASCADE;
ALTER TABLE public.lti_resource_links ADD CONSTRAINT lti_resource_links_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE;
ALTER TABLE public.lti_resource_links ADD CONSTRAINT lti_resource_links_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES lti_registrations(id) ON DELETE CASCADE;
ALTER TABLE public.meeting_participants ADD CONSTRAINT meeting_participants_session_id_fkey FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.meeting_reactions ADD CONSTRAINT meeting_reactions_session_id_fkey FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.mentor_goals ADD CONSTRAINT mentor_goals_enrolment_id_fkey FOREIGN KEY (enrolment_id) REFERENCES enrolments(id) ON DELETE CASCADE;
ALTER TABLE public.mentor_messages ADD CONSTRAINT mentor_messages_enrolment_id_fkey FOREIGN KEY (enrolment_id) REFERENCES enrolments(id) ON DELETE CASCADE;
ALTER TABLE public.mentor_sessions ADD CONSTRAINT mentor_sessions_enrolment_id_fkey FOREIGN KEY (enrolment_id) REFERENCES enrolments(id) ON DELETE CASCADE;
ALTER TABLE public.moderation_items ADD CONSTRAINT moderation_items_programme_id_fkey FOREIGN KEY (programme_id) REFERENCES programmes(id);
ALTER TABLE public.moderation_items ADD CONSTRAINT moderation_items_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES assessment_submissions(id);
ALTER TABLE public.moderator_reports ADD CONSTRAINT moderator_reports_cohort_id_fkey FOREIGN KEY (cohort_id) REFERENCES cohorts(id) ON DELETE SET NULL;
ALTER TABLE public.moderator_reports ADD CONSTRAINT moderator_reports_programme_id_fkey FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE CASCADE;
ALTER TABLE public.module_prerequisites ADD CONSTRAINT module_prerequisites_module_id_fkey FOREIGN KEY (module_id) REFERENCES programme_modules(id) ON DELETE CASCADE;
ALTER TABLE public.module_prerequisites ADD CONSTRAINT module_prerequisites_prerequisite_module_id_fkey FOREIGN KEY (prerequisite_module_id) REFERENCES programme_modules(id) ON DELETE CASCADE;
ALTER TABLE public.pathways ADD CONSTRAINT pathways_programme_id_fkey FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE CASCADE;
ALTER TABLE public.payment_gateways ADD CONSTRAINT payment_gateways_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;
ALTER TABLE public.payment_routing_rules ADD CONSTRAINT payment_routing_rules_fallback_gateway_id_fkey FOREIGN KEY (fallback_gateway_id) REFERENCES payment_gateways(id) ON DELETE SET NULL;
ALTER TABLE public.payment_routing_rules ADD CONSTRAINT payment_routing_rules_primary_gateway_id_fkey FOREIGN KEY (primary_gateway_id) REFERENCES payment_gateways(id) ON DELETE CASCADE;
ALTER TABLE public.payment_routing_rules ADD CONSTRAINT payment_routing_rules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;
ALTER TABLE public.payment_transactions ADD CONSTRAINT payment_transactions_enrolment_id_fkey FOREIGN KEY (enrolment_id) REFERENCES enrolments(id) ON DELETE SET NULL;
ALTER TABLE public.payment_transactions ADD CONSTRAINT payment_transactions_gateway_id_fkey FOREIGN KEY (gateway_id) REFERENCES payment_gateways(id) ON DELETE CASCADE;
ALTER TABLE public.payment_transactions ADD CONSTRAINT payment_transactions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;
ALTER TABLE public.payment_webhook_logs ADD CONSTRAINT payment_webhook_logs_gateway_id_fkey FOREIGN KEY (gateway_id) REFERENCES payment_gateways(id) ON DELETE CASCADE;
ALTER TABLE public.peer_review_assignments ADD CONSTRAINT peer_review_assignments_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE;
ALTER TABLE public.peer_review_assignments ADD CONSTRAINT peer_review_assignments_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES assessment_submissions(id) ON DELETE SET NULL;
ALTER TABLE public.peer_reviews ADD CONSTRAINT peer_reviews_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES peer_review_assignments(id) ON DELETE CASCADE;
ALTER TABLE public.plagiarism_checks ADD CONSTRAINT plagiarism_checks_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES assessment_submissions(id) ON DELETE CASCADE;
ALTER TABLE public.policy_document_versions ADD CONSTRAINT policy_document_versions_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES policy_documents(id) ON DELETE CASCADE;
ALTER TABLE public.proctoring_violations ADD CONSTRAINT proctoring_violations_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES assessment_submissions(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.programme_assessment_config ADD CONSTRAINT programme_assessment_config_programme_id_fkey FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE CASCADE;
ALTER TABLE public.programme_completion_config ADD CONSTRAINT programme_completion_config_programme_id_fkey FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE CASCADE;
ALTER TABLE public.programme_enrolment_config ADD CONSTRAINT programme_enrolment_config_programme_id_fkey FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE CASCADE;
ALTER TABLE public.programme_lifecycle_audit ADD CONSTRAINT programme_lifecycle_audit_programme_id_fkey FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE CASCADE;
ALTER TABLE public.programme_modules ADD CONSTRAINT programme_modules_pathway_id_fkey FOREIGN KEY (pathway_id) REFERENCES pathways(id) ON DELETE SET NULL;
ALTER TABLE public.programme_modules ADD CONSTRAINT programme_modules_prerequisite_module_id_fkey FOREIGN KEY (prerequisite_module_id) REFERENCES programme_modules(id) ON DELETE SET NULL;
ALTER TABLE public.programme_modules ADD CONSTRAINT programme_modules_programme_id_fkey FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE CASCADE;
ALTER TABLE public.programme_type_country_mappings ADD CONSTRAINT programme_type_country_mappings_country_id_fkey FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE;
ALTER TABLE public.programme_type_country_mappings ADD CONSTRAINT programme_type_country_mappings_qualification_framework_id_fkey FOREIGN KEY (qualification_framework_id) REFERENCES qualification_frameworks(id);
ALTER TABLE public.programme_type_country_mappings ADD CONSTRAINT programme_type_country_mappings_regulatory_body_id_fkey FOREIGN KEY (regulatory_body_id) REFERENCES regulatory_bodies(id);
ALTER TABLE public.programmes ADD CONSTRAINT programmes_country_id_fkey FOREIGN KEY (country_id) REFERENCES countries(id);
ALTER TABLE public.programmes ADD CONSTRAINT programmes_programme_type_id_fkey FOREIGN KEY (programme_type_id) REFERENCES programme_types(id);
ALTER TABLE public.programmes ADD CONSTRAINT programmes_qualification_framework_id_fkey FOREIGN KEY (qualification_framework_id) REFERENCES qualification_frameworks(id);
ALTER TABLE public.programmes ADD CONSTRAINT programmes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;
ALTER TABLE public.qualification_frameworks ADD CONSTRAINT qualification_frameworks_country_id_fkey FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE;
ALTER TABLE public.qualification_levels ADD CONSTRAINT qualification_levels_framework_id_fkey FOREIGN KEY (framework_id) REFERENCES qualification_frameworks(id) ON DELETE CASCADE;
ALTER TABLE public.question_bank_items ADD CONSTRAINT question_bank_items_bank_id_fkey FOREIGN KEY (bank_id) REFERENCES question_banks(id) ON DELETE CASCADE;
ALTER TABLE public.question_banks ADD CONSTRAINT question_banks_programme_id_fkey FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE SET NULL;
ALTER TABLE public.quiz_options ADD CONSTRAINT quiz_options_question_id_fkey FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE;
ALTER TABLE public.quiz_questions ADD CONSTRAINT quiz_questions_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE;
ALTER TABLE public.quiz_responses ADD CONSTRAINT quiz_responses_question_id_fkey FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE;
ALTER TABLE public.quiz_responses ADD CONSTRAINT quiz_responses_selected_option_id_fkey FOREIGN KEY (selected_option_id) REFERENCES quiz_options(id);
ALTER TABLE public.quiz_responses ADD CONSTRAINT quiz_responses_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES assessment_submissions(id) ON DELETE CASCADE;
ALTER TABLE public.registration_approval_steps ADD CONSTRAINT registration_approval_steps_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES learner_registrations(id) ON DELETE CASCADE;
ALTER TABLE public.regulatory_bodies ADD CONSTRAINT regulatory_bodies_country_id_fkey FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE;
ALTER TABLE public.reporting_mandates ADD CONSTRAINT reporting_mandates_framework_id_fkey FOREIGN KEY (framework_id) REFERENCES country_regulatory_frameworks(id) ON DELETE CASCADE;
ALTER TABLE public.reporting_mandates ADD CONSTRAINT reporting_mandates_submission_body_id_fkey FOREIGN KEY (submission_body_id) REFERENCES regulatory_bodies(id);
ALTER TABLE public.role_definitions ADD CONSTRAINT role_definitions_template_source_id_fkey FOREIGN KEY (template_source_id) REFERENCES role_definitions(id);
ALTER TABLE public.role_permissions ADD CONSTRAINT role_permissions_role_definition_id_fkey FOREIGN KEY (role_definition_id) REFERENCES role_definitions(id) ON DELETE CASCADE;
ALTER TABLE public.rubric_criteria ADD CONSTRAINT rubric_criteria_rubric_id_fkey FOREIGN KEY (rubric_id) REFERENCES rubrics(id) ON DELETE CASCADE;
ALTER TABLE public.rubrics ADD CONSTRAINT rubrics_programme_id_fkey FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE SET NULL;
ALTER TABLE public.session_attendance ADD CONSTRAINT session_attendance_session_id_fkey FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.session_chat_messages ADD CONSTRAINT session_chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.session_notes ADD CONSTRAINT session_notes_session_id_fkey FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.shared_content_items ADD CONSTRAINT shared_content_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.shared_content_versions ADD CONSTRAINT shared_content_versions_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id);
ALTER TABLE public.shared_content_versions ADD CONSTRAINT shared_content_versions_item_id_fkey FOREIGN KEY (item_id) REFERENCES shared_content_items(id) ON DELETE CASCADE;
ALTER TABLE public.sponsor_compliance_evidence ADD CONSTRAINT sponsor_compliance_evidence_record_id_fkey FOREIGN KEY (record_id) REFERENCES sponsor_compliance_records(id) ON DELETE CASCADE;
ALTER TABLE public.sponsor_compliance_frameworks ADD CONSTRAINT sponsor_compliance_frameworks_country_id_fkey FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE;
ALTER TABLE public.sponsor_compliance_indicators ADD CONSTRAINT sponsor_compliance_indicators_framework_id_fkey FOREIGN KEY (framework_id) REFERENCES sponsor_compliance_frameworks(id) ON DELETE CASCADE;
ALTER TABLE public.sponsor_compliance_records ADD CONSTRAINT sponsor_compliance_records_framework_id_fkey FOREIGN KEY (framework_id) REFERENCES sponsor_compliance_frameworks(id);
ALTER TABLE public.sponsor_compliance_records ADD CONSTRAINT sponsor_compliance_records_indicator_id_fkey FOREIGN KEY (indicator_id) REFERENCES sponsor_compliance_indicators(id);
ALTER TABLE public.sponsor_compliance_reports ADD CONSTRAINT sponsor_compliance_reports_framework_id_fkey FOREIGN KEY (framework_id) REFERENCES sponsor_compliance_frameworks(id);
ALTER TABLE public.sponsor_invoices ADD CONSTRAINT sponsor_invoices_cohort_id_fkey FOREIGN KEY (cohort_id) REFERENCES cohorts(id) ON DELETE SET NULL;
ALTER TABLE public.sponsor_invoices ADD CONSTRAINT sponsor_invoices_country_id_fkey FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE SET NULL;
ALTER TABLE public.sponsor_invoices ADD CONSTRAINT sponsor_invoices_framework_id_fkey FOREIGN KEY (framework_id) REFERENCES country_regulatory_frameworks(id) ON DELETE SET NULL;
ALTER TABLE public.sponsor_invoices ADD CONSTRAINT sponsor_invoices_programme_id_fkey FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE SET NULL;
ALTER TABLE public.sponsor_invoices ADD CONSTRAINT sponsor_invoices_programme_type_id_fkey FOREIGN KEY (programme_type_id) REFERENCES programme_types(id) ON DELETE SET NULL;
ALTER TABLE public.sponsor_invoices ADD CONSTRAINT sponsor_invoices_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES sponsor_quotes(id) ON DELETE SET NULL;
ALTER TABLE public.sponsor_messages ADD CONSTRAINT sponsor_messages_parent_message_id_fkey FOREIGN KEY (parent_message_id) REFERENCES sponsor_messages(id) ON DELETE SET NULL;
ALTER TABLE public.sponsor_profiles ADD CONSTRAINT sponsor_profiles_country_id_fkey FOREIGN KEY (country_id) REFERENCES countries(id);
ALTER TABLE public.sponsor_programme_links ADD CONSTRAINT sponsor_programme_links_cohort_id_fkey FOREIGN KEY (cohort_id) REFERENCES cohorts(id);
ALTER TABLE public.sponsor_programme_links ADD CONSTRAINT sponsor_programme_links_enrolment_id_fkey FOREIGN KEY (enrolment_id) REFERENCES enrolments(id);
ALTER TABLE public.sponsor_programme_links ADD CONSTRAINT sponsor_programme_links_programme_id_fkey FOREIGN KEY (programme_id) REFERENCES programmes(id);
ALTER TABLE public.sponsor_quotes ADD CONSTRAINT sponsor_quotes_cohort_id_fkey FOREIGN KEY (cohort_id) REFERENCES cohorts(id) ON DELETE SET NULL;
ALTER TABLE public.sponsor_quotes ADD CONSTRAINT sponsor_quotes_country_id_fkey FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE SET NULL;
ALTER TABLE public.sponsor_quotes ADD CONSTRAINT sponsor_quotes_programme_id_fkey FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE SET NULL;
ALTER TABLE public.sponsor_quotes ADD CONSTRAINT sponsor_quotes_programme_type_id_fkey FOREIGN KEY (programme_type_id) REFERENCES programme_types(id) ON DELETE SET NULL;
ALTER TABLE public.sponsor_sd_expenditures ADD CONSTRAINT sponsor_sd_expenditures_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES sponsor_sd_profiles(id) ON DELETE CASCADE;
ALTER TABLE public.staff_document_requests ADD CONSTRAINT staff_document_requests_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES staff_registrations(id) ON DELETE CASCADE;
ALTER TABLE public.staff_role_assignments ADD CONSTRAINT staff_role_assignments_staff_registration_id_fkey FOREIGN KEY (staff_registration_id) REFERENCES staff_registrations(id) ON DELETE CASCADE;
ALTER TABLE public.staff_verification_items ADD CONSTRAINT staff_verification_items_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES staff_registrations(id) ON DELETE CASCADE;
ALTER TABLE public.tenant_audit_log ADD CONSTRAINT tenant_audit_log_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE public.tenant_feature_flags ADD CONSTRAINT tenant_feature_flags_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE public.tenant_users ADD CONSTRAINT tenant_users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE public.tenant_users ADD CONSTRAINT tenant_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.training_sessions ADD CONSTRAINT training_sessions_cohort_id_fkey FOREIGN KEY (cohort_id) REFERENCES cohorts(id) ON DELETE CASCADE;
ALTER TABLE public.training_sessions ADD CONSTRAINT training_sessions_recurrence_parent_id_fkey FOREIGN KEY (recurrence_parent_id) REFERENCES training_sessions(id);
ALTER TABLE public.training_sessions ADD CONSTRAINT training_sessions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;
ALTER TABLE public.user_generated_content ADD CONSTRAINT user_generated_content_programme_id_fkey FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE SET NULL;
ALTER TABLE public.user_role_scopes ADD CONSTRAINT user_role_scopes_role_definition_id_fkey FOREIGN KEY (role_definition_id) REFERENCES role_definitions(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.verification_checklist_items ADD CONSTRAINT verification_checklist_items_evidence_document_id_fkey FOREIGN KEY (evidence_document_id) REFERENCES learner_documents(id);
ALTER TABLE public.verification_checklist_items ADD CONSTRAINT verification_checklist_items_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES learner_registrations(id) ON DELETE CASCADE;
ALTER TABLE public.workflow_audit_log ADD CONSTRAINT workflow_audit_log_instance_id_fkey FOREIGN KEY (instance_id) REFERENCES workflow_instances(id);
ALTER TABLE public.workflow_audit_log ADD CONSTRAINT workflow_audit_log_step_instance_id_fkey FOREIGN KEY (step_instance_id) REFERENCES workflow_step_instances(id);
ALTER TABLE public.workflow_instances ADD CONSTRAINT workflow_instances_current_step_id_fkey FOREIGN KEY (current_step_id) REFERENCES workflow_steps(id);
ALTER TABLE public.workflow_instances ADD CONSTRAINT workflow_instances_template_id_fkey FOREIGN KEY (template_id) REFERENCES workflow_templates(id);
ALTER TABLE public.workflow_step_instances ADD CONSTRAINT workflow_step_instances_instance_id_fkey FOREIGN KEY (instance_id) REFERENCES workflow_instances(id) ON DELETE CASCADE;
ALTER TABLE public.workflow_step_instances ADD CONSTRAINT workflow_step_instances_step_id_fkey FOREIGN KEY (step_id) REFERENCES workflow_steps(id);
ALTER TABLE public.workflow_steps ADD CONSTRAINT workflow_steps_template_id_fkey FOREIGN KEY (template_id) REFERENCES workflow_templates(id) ON DELETE CASCADE;
ALTER TABLE public.workplace_evidence ADD CONSTRAINT workplace_evidence_enrolment_id_fkey FOREIGN KEY (enrolment_id) REFERENCES enrolments(id) ON DELETE CASCADE;

-- ── INDEXES ───────────────────────────────────────────────
CREATE INDEX idx_announcement_reads_user ON public.announcement_reads USING btree (user_id, announcement_id);
CREATE INDEX idx_announcements_scope ON public.announcements USING btree (scope_type, scope_id, is_published);
CREATE INDEX idx_assessment_links_assessment ON public.assessment_links USING btree (assessment_id);
CREATE INDEX idx_assessment_links_lesson ON public.assessment_links USING btree (lesson_id);
CREATE INDEX idx_assessment_links_module ON public.assessment_links USING btree (module_id);
CREATE INDEX idx_assessment_links_pathway ON public.assessment_links USING btree (pathway_id);
CREATE INDEX idx_cms_menu_items_menu_id ON public.cms_menu_items USING btree (menu_id);
CREATE INDEX idx_cms_menu_items_parent ON public.cms_menu_items USING btree (parent_item_id);
CREATE INDEX idx_cms_page_blocks_page_id ON public.cms_page_blocks USING btree (page_id);
CREATE INDEX idx_cms_role_perms_item ON public.cms_role_menu_permissions USING btree (menu_item_id);
CREATE INDEX idx_cms_role_perms_menu ON public.cms_role_menu_permissions USING btree (menu_id);
CREATE INDEX idx_cms_role_perms_role ON public.cms_role_menu_permissions USING btree (role);
CREATE INDEX idx_cohorts_tenant_id ON public.cohorts USING btree (tenant_id);
CREATE INDEX idx_compliance_requirements_mapping ON public.compliance_requirements USING btree (mapping_id);
CREATE INDEX idx_content_blocks_lesson_id ON public.content_blocks USING btree (lesson_id);
CREATE INDEX idx_content_blocks_module ON public.content_blocks USING btree (module_id, sequence_order);
CREATE INDEX idx_country_regulatory_frameworks_country ON public.country_regulatory_frameworks USING btree (country_id);
CREATE INDEX idx_deletion_audit_log_created ON public.deletion_audit_log USING btree (created_at DESC);
CREATE INDEX idx_deletion_audit_log_entity ON public.deletion_audit_log USING btree (entity_type, entity_id);
CREATE INDEX idx_deletion_audit_log_user ON public.deletion_audit_log USING btree (user_id);
CREATE INDEX idx_discussion_posts_thread ON public.discussion_posts USING btree (thread_id, created_at);
CREATE INDEX idx_discussion_threads_scope ON public.discussion_threads USING btree (scope_type, scope_id);
CREATE INDEX idx_enrolments_tenant_id ON public.enrolments USING btree (tenant_id);
CREATE INDEX idx_funding_rules_framework ON public.funding_rules USING btree (framework_id);
CREATE INDEX idx_incentive_schemes_country ON public.incentive_schemes USING btree (country_id);
CREATE INDEX idx_learner_registrations_tenant_id ON public.learner_registrations USING btree (tenant_id);
CREATE INDEX idx_lessons_module_id ON public.lessons USING btree (module_id);
CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id, is_read, created_at DESC);
CREATE INDEX idx_payment_gateways_key ON public.payment_gateways USING btree (gateway_key);
CREATE INDEX idx_payment_gateways_tenant ON public.payment_gateways USING btree (tenant_id);
CREATE INDEX idx_programme_lifecycle_audit_programme ON public.programme_lifecycle_audit USING btree (programme_id, created_at DESC);
CREATE INDEX idx_programme_type_country_mappings_country ON public.programme_type_country_mappings USING btree (country_id);
CREATE INDEX idx_programme_types_active ON public.programme_types USING btree (is_active);
CREATE INDEX idx_programmes_tenant_id ON public.programmes USING btree (tenant_id);
CREATE INDEX idx_qualification_frameworks_country ON public.qualification_frameworks USING btree (country_id);
CREATE INDEX idx_qualification_levels_framework ON public.qualification_levels USING btree (framework_id);
CREATE INDEX idx_regulatory_bodies_country ON public.regulatory_bodies USING btree (country_id);
CREATE INDEX idx_reporting_mandates_framework ON public.reporting_mandates USING btree (framework_id);
CREATE INDEX idx_routing_rules_currency ON public.payment_routing_rules USING btree (currency);
CREATE INDEX idx_sd_expenditures_learner ON public.sponsor_sd_expenditures USING btree (learner_id) WHERE (learner_id IS NOT NULL);
CREATE INDEX idx_session_chat_session ON public.session_chat_messages USING btree (session_id, created_at);
CREATE INDEX idx_session_notes_session ON public.session_notes USING btree (session_id);
CREATE INDEX idx_sponsor_invitations_email ON public.sponsor_invitations USING btree (email);
CREATE INDEX idx_sponsor_invitations_token ON public.sponsor_invitations USING btree (token);
CREATE INDEX idx_sponsor_links_cohort ON public.sponsor_programme_links USING btree (cohort_id);
CREATE INDEX idx_sponsor_links_programme ON public.sponsor_programme_links USING btree (programme_id);
CREATE INDEX idx_sponsor_links_sponsor_id ON public.sponsor_programme_links USING btree (sponsor_id);
CREATE INDEX idx_sponsor_profiles_status ON public.sponsor_profiles USING btree (status);
CREATE INDEX idx_sponsor_profiles_user_id ON public.sponsor_profiles USING btree (user_id);
CREATE INDEX idx_tenant_users_tenant_id ON public.tenant_users USING btree (tenant_id);
CREATE INDEX idx_tenant_users_user_id ON public.tenant_users USING btree (user_id);
CREATE INDEX idx_tenants_domain ON public.tenants USING btree (domain);
CREATE INDEX idx_tenants_slug ON public.tenants USING btree (slug);
CREATE INDEX idx_transactions_gateway ON public.payment_transactions USING btree (gateway_id);
CREATE INDEX idx_transactions_tenant ON public.payment_transactions USING btree (tenant_id);
CREATE INDEX idx_transactions_user ON public.payment_transactions USING btree (user_id);
CREATE INDEX idx_webhook_logs_gateway ON public.payment_webhook_logs USING btree (gateway_id);
CREATE INDEX idx_workflow_audit_instance ON public.workflow_audit_log USING btree (instance_id);
CREATE INDEX idx_workflow_instances_entity ON public.workflow_instances USING btree (entity_type, entity_id);
CREATE INDEX idx_workflow_instances_status ON public.workflow_instances USING btree (status);
CREATE INDEX idx_workflow_step_instances_assigned ON public.workflow_step_instances USING btree (assigned_to, status);
CREATE INDEX idx_workflow_step_instances_instance ON public.workflow_step_instances USING btree (instance_id);
CREATE INDEX idx_workflow_steps_template ON public.workflow_steps USING btree (template_id, step_order);
CREATE INDEX idx_workflow_templates_entity ON public.workflow_templates USING btree (entity_type, is_active);

-- ── ROW LEVEL SECURITY ────────────────────────────────────
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessor_report_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessor_report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessor_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_page_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_role_menu_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_skill_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_regulatory_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_content_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delegated_approvers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deletion_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directory_oversight_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drip_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrolment_toggles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrolments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_content_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.font_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.font_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funding_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incentive_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issued_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_content_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_eligibility_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_skill_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lti_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lti_resource_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderator_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pathways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peer_review_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peer_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plagiarism_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proctoring_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programme_assessment_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programme_completion_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programme_enrolment_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programme_lifecycle_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programme_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programme_type_country_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programme_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualification_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualification_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulatory_bodies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reporting_mandates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubric_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_compliance_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_compliance_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_compliance_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_compliance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_compliance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_programme_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_sd_expenditures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_sd_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_seta_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_verification_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typography_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typography_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_generated_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_step_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workplace_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read all receipts" ON public.announcement_reads AS PERMISSIVE FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role)));
CREATE POLICY "Users insert own receipts" ON public.announcement_reads AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users read own receipts" ON public.announcement_reads AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Authenticated read published announcements" ON public.announcements AS PERMISSIVE FOR SELECT TO authenticated USING ((is_published = true));
CREATE POLICY "Staff manage announcements" ON public.announcements AS PERMISSIVE FOR ALL TO authenticated USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role) OR has_role(auth.uid(), 'operations'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role) OR has_role(auth.uid(), 'operations'::app_role)));
CREATE POLICY "Admins manage approval routing rules" ON public.approval_routing_rules AS PERMISSIVE FOR ALL TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role)));
CREATE POLICY "Authenticated read approval routing rules" ON public.approval_routing_rules AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Admins manage all tasks" ON public.approval_tasks AS PERMISSIVE FOR ALL TO authenticated USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role)));
CREATE POLICY "Assigned users can update tasks" ON public.approval_tasks AS PERMISSIVE FOR UPDATE TO authenticated USING ((assigned_to = auth.uid()));
CREATE POLICY "Programme creators can submit approval tasks" ON public.approval_tasks AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() IS NOT NULL) AND (requested_by = auth.uid()) AND (reference_table = 'programmes'::text) AND (task_type = 'programme_approval'::text) AND (status = 'pending'::text)));
CREATE POLICY "Programme managers see programme tasks" ON public.approval_tasks AS PERMISSIVE FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'programme_manager'::app_role) AND (reference_table = 'programmes'::text)));
CREATE POLICY "Users see own tasks" ON public.approval_tasks AS PERMISSIVE FOR SELECT TO authenticated USING (((assigned_to = auth.uid()) OR (requested_by = auth.uid())));
CREATE POLICY "Authenticated users can read assessment_links" ON public.assessment_links AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authorized users can delete assessment_links" ON public.assessment_links AS PERMISSIVE FOR DELETE TO authenticated USING ((has_permission(auth.uid(), 'programme'::text, 'create'::text) OR is_platform_admin(auth.uid())));
CREATE POLICY "Authorized users can insert assessment_links" ON public.assessment_links AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((has_permission(auth.uid(), 'programme'::text, 'create'::text) OR is_platform_admin(auth.uid())));
CREATE POLICY "Authorized users can update assessment_links" ON public.assessment_links AS PERMISSIVE FOR UPDATE TO authenticated USING ((has_permission(auth.uid(), 'programme'::text, 'create'::text) OR is_platform_admin(auth.uid())));
CREATE POLICY "Authenticated can read assessment_rubrics" ON public.assessment_rubrics AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage assessment_rubrics" ON public.assessment_rubrics AS PERMISSIVE FOR ALL TO authenticated USING ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role)));
CREATE POLICY "Authenticated can read assessment_settings" ON public.assessment_settings AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage assessment_settings" ON public.assessment_settings AS PERMISSIVE FOR ALL TO authenticated USING ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role)));
CREATE POLICY "Admins manage all submissions" ON public.assessment_submissions AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Assessors manage assigned submissions" ON public.assessment_submissions AS PERMISSIVE FOR ALL TO authenticated USING (((assessor_id = auth.uid()) OR has_role(auth.uid(), 'assessor'::app_role))) WITH CHECK (((assessor_id = auth.uid()) OR has_role(auth.uid(), 'assessor'::app_role)));
CREATE POLICY "Learners see own submissions" ON public.assessment_submissions AS PERMISSIVE FOR SELECT TO authenticated USING ((learner_id = auth.uid()));
CREATE POLICY "Learners submit own" ON public.assessment_submissions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((learner_id = auth.uid()));
CREATE POLICY "Learners update own pending" ON public.assessment_submissions AS PERMISSIVE FOR UPDATE TO authenticated USING (((learner_id = auth.uid()) AND (status = ANY (ARRAY['pending'::text, 'resubmit'::text]))));
CREATE POLICY "Moderators review submissions" ON public.assessment_submissions AS PERMISSIVE FOR ALL TO authenticated USING (((moderator_id = auth.uid()) OR has_role(auth.uid(), 'moderator'::app_role))) WITH CHECK (((moderator_id = auth.uid()) OR has_role(auth.uid(), 'moderator'::app_role)));
CREATE POLICY "Admins manage assessments" ON public.assessments AS PERMISSIVE FOR ALL TO authenticated USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'assessor'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'assessor'::app_role)));
CREATE POLICY "Authenticated read assessments" ON public.assessments AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage template versions" ON public.assessor_report_template_versions AS PERMISSIVE FOR ALL TO authenticated USING (is_platform_admin(auth.uid()));
CREATE POLICY "Authenticated can read template versions" ON public.assessor_report_template_versions AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage templates" ON public.assessor_report_templates AS PERMISSIVE FOR ALL TO authenticated USING (is_platform_admin(auth.uid()));
CREATE POLICY "Authenticated can read active templates" ON public.assessor_report_templates AS PERMISSIVE FOR SELECT TO authenticated USING ((is_active = true));
CREATE POLICY "Assessors manage own reports" ON public.assessor_reports AS PERMISSIVE FOR ALL TO authenticated USING (((assessor_id = auth.uid()) OR is_platform_admin(auth.uid()))) WITH CHECK (((assessor_id = auth.uid()) OR is_platform_admin(auth.uid())));
CREATE POLICY "Staff view all reports" ON public.assessor_reports AS PERMISSIVE FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role)));
CREATE POLICY "Assignee can view own findings" ON public.audit_findings AS PERMISSIVE FOR SELECT TO authenticated USING ((assigned_to = auth.uid()));
CREATE POLICY "Platform admins can manage findings" ON public.audit_findings AS PERMISSIVE FOR ALL TO authenticated USING ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role)));
CREATE POLICY "Admin can manage badges" ON public.badges AS PERMISSIVE FOR ALL TO authenticated USING (is_platform_admin(auth.uid()));
CREATE POLICY "Authenticated can read badges" ON public.badges AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read certificate_templates" ON public.certificate_templates AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage certificate_templates" ON public.certificate_templates AS PERMISSIVE FOR ALL TO authenticated USING ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'programme_manager'::app_role)));
CREATE POLICY "Learners can insert own attempts" ON public.challenge_exam_attempts AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((learner_id = auth.uid()));
CREATE POLICY "Learners can read own attempts" ON public.challenge_exam_attempts AS PERMISSIVE FOR SELECT TO authenticated USING (((learner_id = auth.uid()) OR is_platform_admin(auth.uid())));
CREATE POLICY "Learners can update own attempts" ON public.challenge_exam_attempts AS PERMISSIVE FOR UPDATE TO authenticated USING ((learner_id = auth.uid()));
CREATE POLICY "Admins can delete challenge exams" ON public.challenge_exams AS PERMISSIVE FOR DELETE TO authenticated USING (is_platform_admin(auth.uid()));
CREATE POLICY "Admins can manage challenge exams" ON public.challenge_exams AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'programme_manager'::app_role)));
CREATE POLICY "Admins can update challenge exams" ON public.challenge_exams AS PERMISSIVE FOR UPDATE TO authenticated USING ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'programme_manager'::app_role)));
CREATE POLICY "Auth users can read challenge exams" ON public.challenge_exams AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage menu items" ON public.cms_menu_items AS PERMISSIVE FOR ALL TO authenticated USING (is_platform_admin(auth.uid())) WITH CHECK (is_platform_admin(auth.uid()));
CREATE POLICY "Anyone can read menu items" ON public.cms_menu_items AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage menus" ON public.cms_menus AS PERMISSIVE FOR ALL TO authenticated USING (is_platform_admin(auth.uid())) WITH CHECK (is_platform_admin(auth.uid()));
CREATE POLICY "Anyone can read active menus" ON public.cms_menus AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage page blocks" ON public.cms_page_blocks AS PERMISSIVE FOR ALL TO authenticated USING (is_platform_admin(auth.uid())) WITH CHECK (is_platform_admin(auth.uid()));
CREATE POLICY "Anyone can read page blocks" ON public.cms_page_blocks AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage pages" ON public.cms_pages AS PERMISSIVE FOR ALL TO authenticated USING (is_platform_admin(auth.uid())) WITH CHECK (is_platform_admin(auth.uid()));
CREATE POLICY "Anyone can read published pages" ON public.cms_pages AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage role permissions" ON public.cms_role_menu_permissions AS PERMISSIVE FOR ALL TO authenticated USING (is_platform_admin(auth.uid())) WITH CHECK (is_platform_admin(auth.uid()));
CREATE POLICY "Anyone can read role permissions" ON public.cms_role_menu_permissions AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can delete cohort staff" ON public.cohort_staff_assignments AS PERMISSIVE FOR DELETE TO authenticated USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role)));
CREATE POLICY "Admins can insert cohort staff" ON public.cohort_staff_assignments AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role)));
CREATE POLICY "Authenticated users can delete cohort staff assignments" ON public.cohort_staff_assignments AS PERMISSIVE FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert cohort staff assignments" ON public.cohort_staff_assignments AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can read cohort staff assignments" ON public.cohort_staff_assignments AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage cohorts" ON public.cohorts AS PERMISSIVE FOR ALL TO authenticated USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role)));
CREATE POLICY "Authenticated can read cohorts" ON public.cohorts AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Facilitators manage assigned cohorts" ON public.cohorts AS PERMISSIVE FOR ALL TO authenticated USING ((facilitator_id = auth.uid())) WITH CHECK ((facilitator_id = auth.uid()));
CREATE POLICY "Admins manage compliance requirements" ON public.compliance_requirements AS PERMISSIVE FOR ALL TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role)));
CREATE POLICY "Authenticated users can read compliance_requirements" ON public.compliance_requirements AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage content blocks" ON public.content_blocks AS PERMISSIVE FOR ALL TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role)));
CREATE POLICY "Authenticated read content blocks" ON public.content_blocks AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can read comments" ON public.content_comments AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create comments" ON public.content_comments AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can delete own comments" ON public.content_comments AS PERMISSIVE FOR DELETE TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can update own comments" ON public.content_comments AS PERMISSIVE FOR UPDATE TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Authenticated can read content_prerequisites" ON public.content_prerequisites AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage content_prerequisites" ON public.content_prerequisites AS PERMISSIVE FOR ALL TO authenticated USING ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'programme_manager'::app_role)));
CREATE POLICY "Authenticated can read ratings" ON public.content_ratings AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can delete own ratings" ON public.content_ratings AS PERMISSIVE FOR DELETE TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can manage own ratings" ON public.content_ratings AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can update own ratings" ON public.content_ratings AS PERMISSIVE FOR UPDATE TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Authenticated can read skill tags" ON public.content_skill_tags AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage skill tags" ON public.content_skill_tags AS PERMISSIVE FOR ALL TO authenticated USING (has_permission(auth.uid(), 'programme'::text, 'create'::text)) WITH CHECK (has_permission(auth.uid(), 'programme'::text, 'create'::text));
CREATE POLICY "Admins manage countries" ON public.countries AS PERMISSIVE FOR ALL TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role)));
CREATE POLICY "Authenticated users can read countries" ON public.countries AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public can read countries" ON public.countries AS PERMISSIVE FOR SELECT TO anon USING (true);
CREATE POLICY "Admins manage regulatory frameworks" ON public.country_regulatory_frameworks AS PERMISSIVE FOR ALL TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role)));
CREATE POLICY "Authenticated users can read country_regulatory_frameworks" ON public.country_regulatory_frameworks AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can delete course content links" ON public.course_content_links AS PERMISSIVE FOR DELETE TO authenticated USING (true);
CREATE POLICY "Auth users can manage course content links" ON public.course_content_links AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can read course content links" ON public.course_content_links AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can update course content links" ON public.course_content_links AS PERMISSIVE FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Content managers can delete course content links" ON public.course_content_links AS PERMISSIVE FOR DELETE TO authenticated USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role)));
CREATE POLICY "Content managers can insert course content links" ON public.course_content_links AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role)));
CREATE POLICY "Content managers can update course content links" ON public.course_content_links AS PERMISSIVE FOR UPDATE TO authenticated USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role)));
CREATE POLICY "Delegated users read own" ON public.delegated_approvers AS PERMISSIVE FOR SELECT TO public USING ((delegated_user_id = auth.uid()));
CREATE POLICY "Ops and super_admin manage delegations" ON public.delegated_approvers AS PERMISSIVE FOR ALL TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role)));
CREATE POLICY "Admin read deletion audit logs" ON public.deletion_audit_log AS PERMISSIVE FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role)));
CREATE POLICY "Authenticated insert deletion audit logs" ON public.deletion_audit_log AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can read oversight settings" ON public.directory_oversight_settings AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Operations can manage scoped oversight settings" ON public.directory_oversight_settings AS PERMISSIVE FOR ALL TO authenticated USING ((has_role(auth.uid(), 'operations'::app_role) AND (target_role = ANY (ARRAY['programme_manager'::text, 'facilitator'::text, 'assessor'::text, 'moderator'::text, 'mentor'::text, 'learner'::text, 'sponsor'::text, 'talent_manager'::text])))) WITH CHECK ((has_role(auth.uid(), 'operations'::app_role) AND (target_role = ANY (ARRAY['programme_manager'::text, 'facilitator'::text, 'assessor'::text, 'moderator'::text, 'mentor'::text, 'learner'::text, 'sponsor'::text, 'talent_manager'::text]))));
CREATE POLICY "Super admins can manage all oversight settings" ON public.directory_oversight_settings AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Authenticated create posts" ON public.discussion_posts AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = author_id));
CREATE POLICY "Authenticated read posts" ON public.discussion_posts AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authors update own posts" ON public.discussion_posts AS PERMISSIVE FOR UPDATE TO authenticated USING ((author_id = auth.uid()));
CREATE POLICY "Staff manage posts" ON public.discussion_posts AS PERMISSIVE FOR ALL TO authenticated USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role)));
CREATE POLICY "Authenticated create threads" ON public.discussion_threads AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = author_id));
CREATE POLICY "Authenticated read threads" ON public.discussion_threads AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authors update own threads" ON public.discussion_threads AS PERMISSIVE FOR UPDATE TO authenticated USING ((author_id = auth.uid()));
CREATE POLICY "Staff manage threads" ON public.discussion_threads AS PERMISSIVE FOR ALL TO authenticated USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role)));
CREATE POLICY "Staff manage document requests" ON public.document_requests AS PERMISSIVE FOR ALL TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role) OR has_role(auth.uid(), 'assessor'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role) OR has_role(auth.uid(), 'assessor'::app_role)));
CREATE POLICY "Admins can delete drip schedules" ON public.drip_schedules AS PERMISSIVE FOR DELETE TO authenticated USING ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'programme_manager'::app_role)));
CREATE POLICY "Admins can manage drip schedules" ON public.drip_schedules AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'programme_manager'::app_role)));
CREATE POLICY "Admins can update drip schedules" ON public.drip_schedules AS PERMISSIVE FOR UPDATE TO authenticated USING ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'programme_manager'::app_role)));
CREATE POLICY "Auth users can read drip schedules" ON public.drip_schedules AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read enrolment toggles" ON public.enrolment_toggles AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Ops and admin manage enrolment toggles" ON public.enrolment_toggles AS PERMISSIVE FOR ALL TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role)));
CREATE POLICY "Programme managers manage cohort toggles" ON public.enrolment_toggles AS PERMISSIVE FOR ALL TO public USING ((has_role(auth.uid(), 'programme_manager'::app_role) AND (scope_level = 'cohort'::text))) WITH CHECK ((has_role(auth.uid(), 'programme_manager'::app_role) AND (scope_level = 'cohort'::text)));
CREATE POLICY "Admins manage enrolments" ON public.enrolments AS PERMISSIVE FOR ALL TO authenticated USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role)));
CREATE POLICY "Assessors can read enrolments" ON public.enrolments AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'assessor'::app_role));
CREATE POLICY "Learners can enrol themselves" ON public.enrolments AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((learner_id = auth.uid()));
CREATE POLICY "Learners see own enrolments" ON public.enrolments AS PERMISSIVE FOR SELECT TO authenticated USING ((learner_id = auth.uid()));
CREATE POLICY "Mentors see assigned enrolments" ON public.enrolments AS PERMISSIVE FOR SELECT TO authenticated USING ((mentor_id = auth.uid()));
CREATE POLICY "Moderators can read enrolments" ON public.enrolments AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'moderator'::app_role));
CREATE POLICY "Sponsors see sponsored enrolments" ON public.enrolments AS PERMISSIVE FOR SELECT TO authenticated USING ((sponsor_id = auth.uid()));
CREATE POLICY "Talent managers can read enrolments" ON public.enrolments AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'talent_manager'::app_role));
CREATE POLICY "Admins can manage external content" ON public.external_content_items AS PERMISSIVE FOR ALL TO authenticated USING (is_platform_admin(auth.uid())) WITH CHECK (is_platform_admin(auth.uid()));
CREATE POLICY "Authenticated can read external content" ON public.external_content_items AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage providers" ON public.external_content_providers AS PERMISSIVE FOR ALL TO authenticated USING (is_platform_admin(auth.uid())) WITH CHECK (is_platform_admin(auth.uid()));
CREATE POLICY "Authenticated can read providers" ON public.external_content_providers AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage feature flags" ON public.feature_flags AS PERMISSIVE FOR ALL TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role)));
CREATE POLICY "Authenticated read feature flags" ON public.feature_flags AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Admins insert font audit log" ON public.font_audit_log AS PERMISSIVE FOR INSERT TO public WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role)));
CREATE POLICY "Admins read font audit log" ON public.font_audit_log AS PERMISSIVE FOR SELECT TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role)));
CREATE POLICY "Admins manage font library" ON public.font_library AS PERMISSIVE FOR ALL TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role)));
CREATE POLICY "Public read font library" ON public.font_library AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Admins manage funding rules" ON public.funding_rules AS PERMISSIVE FOR ALL TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role)));
CREATE POLICY "Authenticated users can read funding_rules" ON public.funding_rules AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage incentive schemes" ON public.incentive_schemes AS PERMISSIVE FOR ALL TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role)));
CREATE POLICY "Authenticated users can read incentive_schemes" ON public.incentive_schemes AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Platform admins can manage audits" ON public.internal_audits AS PERMISSIVE FOR ALL TO authenticated USING ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role)));
CREATE POLICY "Admins manage credentials" ON public.issued_credentials AS PERMISSIVE FOR ALL TO authenticated USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role)));
CREATE POLICY "Learners see own credentials" ON public.issued_credentials AS PERMISSIVE FOR SELECT TO authenticated USING ((learner_id = auth.uid()));
CREATE POLICY "Public can verify credentials" ON public.issued_credentials AS PERMISSIVE FOR SELECT TO anon USING ((status = 'active'::text));
CREATE POLICY "Learners can read own badges" ON public.learner_badges AS PERMISSIVE FOR SELECT TO authenticated USING (((learner_id = auth.uid()) OR is_platform_admin(auth.uid())));
CREATE POLICY "System can insert learner_badges" ON public.learner_badges AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'facilitator'::app_role) OR has_role(auth.uid(), 'assessor'::app_role)));
CREATE POLICY "Learners manage own bookmarks" ON public.learner_bookmarks AS PERMISSIVE FOR ALL TO authenticated USING ((learner_id = auth.uid())) WITH CHECK ((learner_id = auth.uid()));
CREATE POLICY "Learners manage own progress" ON public.learner_content_progress AS PERMISSIVE FOR ALL TO authenticated USING ((learner_id = auth.uid())) WITH CHECK ((learner_id = auth.uid()));
CREATE POLICY "Staff read all progress" ON public.learner_content_progress AS PERMISSIVE FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role)));
CREATE POLICY "Compliance officers verify documents" ON public.learner_documents AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'assessor'::app_role)) WITH CHECK (has_role(auth.uid(), 'assessor'::app_role));
CREATE POLICY "Staff manage learner documents" ON public.learner_documents AS PERMISSIVE FOR ALL TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role)));
CREATE POLICY "Staff read eligibility checks" ON public.learner_eligibility_checks AS PERMISSIVE FOR SELECT TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role)));
CREATE POLICY "System manage eligibility checks" ON public.learner_eligibility_checks AS PERMISSIVE FOR ALL TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role)));
CREATE POLICY "Learners manage own notes" ON public.learner_notes AS PERMISSIVE FOR ALL TO authenticated USING ((learner_id = auth.uid())) WITH CHECK ((learner_id = auth.uid()));
CREATE POLICY "Learners can read own points" ON public.learner_points AS PERMISSIVE FOR SELECT TO authenticated USING (((learner_id = auth.uid()) OR is_platform_admin(auth.uid())));
CREATE POLICY "System can insert learner_points" ON public.learner_points AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins and ops manage registrations" ON public.learner_registrations AS PERMISSIVE FOR ALL TO authenticated USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role)));
CREATE POLICY "Delegated approvers can read registrations" ON public.learner_registrations AS PERMISSIVE FOR SELECT TO public USING (is_delegated_approver(auth.uid(), programme_id));
CREATE POLICY "Delegated approvers can update registrations" ON public.learner_registrations AS PERMISSIVE FOR UPDATE TO public USING (is_delegated_approver(auth.uid(), programme_id)) WITH CHECK (is_delegated_approver(auth.uid(), programme_id));
CREATE POLICY "Staff can insert registrations" ON public.learner_registrations AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role)));
CREATE POLICY "Learners can modify own skill profiles" ON public.learner_skill_profiles AS PERMISSIVE FOR UPDATE TO authenticated USING (((learner_id = auth.uid()) OR is_platform_admin(auth.uid())));
CREATE POLICY "Learners can update own skill profiles" ON public.learner_skill_profiles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((learner_id = auth.uid()));
CREATE POLICY "Learners can view own skill profiles" ON public.learner_skill_profiles AS PERMISSIVE FOR SELECT TO authenticated USING (((learner_id = auth.uid()) OR is_platform_admin(auth.uid()) OR has_permission(auth.uid(), 'programme'::text, 'create'::text)));
CREATE POLICY "Learners can update own recommendations" ON public.learning_recommendations AS PERMISSIVE FOR UPDATE TO authenticated USING ((learner_id = auth.uid()));
CREATE POLICY "Learners can view own recommendations" ON public.learning_recommendations AS PERMISSIVE FOR SELECT TO authenticated USING (((learner_id = auth.uid()) OR is_platform_admin(auth.uid())));
CREATE POLICY "System can create recommendations" ON public.learning_recommendations AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can read lessons" ON public.lessons AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authorized users can delete lessons" ON public.lessons AS PERMISSIVE FOR DELETE TO authenticated USING ((has_permission(auth.uid(), 'programme'::text, 'create'::text) OR is_platform_admin(auth.uid())));
CREATE POLICY "Authorized users can insert lessons" ON public.lessons AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((has_permission(auth.uid(), 'programme'::text, 'create'::text) OR is_platform_admin(auth.uid())));
CREATE POLICY "Authorized users can update lessons" ON public.lessons AS PERMISSIVE FOR UPDATE TO authenticated USING ((has_permission(auth.uid(), 'programme'::text, 'create'::text) OR is_platform_admin(auth.uid())));
CREATE POLICY "Admins manage LTI registrations" ON public.lti_registrations AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['super_admin'::app_role, 'systems_admin'::app_role]))))));
CREATE POLICY "Admins manage LTI resource links" ON public.lti_resource_links AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['super_admin'::app_role, 'systems_admin'::app_role, 'operations'::app_role, 'programme_manager'::app_role]))))));
CREATE POLICY "Authenticated read session participants" ON public.meeting_participants AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Facilitators manage all participants" ON public.meeting_participants AS PERMISSIVE FOR ALL TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role)));
CREATE POLICY "Users manage own participation" ON public.meeting_participants AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users update own participation" ON public.meeting_participants AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Authenticated read session reactions" ON public.meeting_reactions AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Users delete own reactions" ON public.meeting_reactions AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users insert own reactions" ON public.meeting_reactions AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Admins see all mentor goals" ON public.mentor_goals AS PERMISSIVE FOR SELECT TO authenticated USING (is_platform_admin(auth.uid()));
CREATE POLICY "Mentors and mentees can access goals" ON public.mentor_goals AS PERMISSIVE FOR ALL TO authenticated USING (((mentor_id = auth.uid()) OR (mentee_id = auth.uid())));
CREATE POLICY "Admins see all messages" ON public.mentor_messages AS PERMISSIVE FOR SELECT TO authenticated USING (is_platform_admin(auth.uid()));
CREATE POLICY "Users can access their messages" ON public.mentor_messages AS PERMISSIVE FOR ALL TO authenticated USING (((sender_id = auth.uid()) OR (recipient_id = auth.uid())));
CREATE POLICY "Admins see all mentor sessions" ON public.mentor_sessions AS PERMISSIVE FOR SELECT TO authenticated USING (is_platform_admin(auth.uid()));
CREATE POLICY "Mentors can manage their sessions" ON public.mentor_sessions AS PERMISSIVE FOR ALL TO authenticated USING (((mentor_id = auth.uid()) OR (mentee_id = auth.uid())));
CREATE POLICY "Authenticated users can flag content" ON public.moderation_items AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Moderators manage moderation items" ON public.moderation_items AS PERMISSIVE FOR ALL TO authenticated USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)));
CREATE POLICY "Users see own flagged items" ON public.moderation_items AS PERMISSIVE FOR SELECT TO authenticated USING ((submitted_by = auth.uid()));
CREATE POLICY "Admins can view all moderator reports" ON public.moderator_reports AS PERMISSIVE FOR SELECT TO authenticated USING (is_platform_admin(auth.uid()));
CREATE POLICY "Moderators can manage own reports" ON public.moderator_reports AS PERMISSIVE FOR ALL TO authenticated USING ((moderator_id = auth.uid())) WITH CHECK ((moderator_id = auth.uid()));
CREATE POLICY "Authenticated can read module_prerequisites" ON public.module_prerequisites AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage module_prerequisites" ON public.module_prerequisites AS PERMISSIVE FOR ALL TO authenticated USING ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'programme_manager'::app_role)));
CREATE POLICY "Users insert own preferences" ON public.notification_preferences AS PERMISSIVE FOR INSERT TO public WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users read own preferences" ON public.notification_preferences AS PERMISSIVE FOR SELECT TO public USING ((user_id = auth.uid()));
CREATE POLICY "Users update own preferences" ON public.notification_preferences AS PERMISSIVE FOR UPDATE TO public USING ((user_id = auth.uid()));
CREATE POLICY "Admins manage all notifications" ON public.notifications AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Authenticated users can create notifications" ON public.notifications AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Users read own notifications" ON public.notifications AS PERMISSIVE FOR SELECT TO public USING ((user_id = auth.uid()));
CREATE POLICY "Users update own notifications" ON public.notifications AS PERMISSIVE FOR UPDATE TO public USING ((user_id = auth.uid()));
CREATE POLICY "Admins and ops can read audit log" ON public.onboarding_audit_log AS PERMISSIVE FOR SELECT TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role) OR has_role(auth.uid(), 'talent_manager'::app_role)));
CREATE POLICY "System can insert audit log" ON public.onboarding_audit_log AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Admins manage pathways" ON public.pathways AS PERMISSIVE FOR ALL TO authenticated USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role)));
CREATE POLICY "Anon read pathways" ON public.pathways AS PERMISSIVE FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated read pathways" ON public.pathways AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can read payment gateways" ON public.payment_gateways AS PERMISSIVE FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role)));
CREATE POLICY "Admins manage gateways" ON public.payment_gateways AS PERMISSIVE FOR ALL TO authenticated USING (is_platform_admin(auth.uid()));
CREATE POLICY "Admins manage routing rules" ON public.payment_routing_rules AS PERMISSIVE FOR ALL TO authenticated USING (is_platform_admin(auth.uid()));
CREATE POLICY "Authenticated users read routing rules" ON public.payment_routing_rules AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage transactions" ON public.payment_transactions AS PERMISSIVE FOR ALL TO authenticated USING (is_platform_admin(auth.uid()));
CREATE POLICY "Users see own transactions" ON public.payment_transactions AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Admins manage webhook logs" ON public.payment_webhook_logs AS PERMISSIVE FOR ALL TO authenticated USING (is_platform_admin(auth.uid()));
CREATE POLICY "Admins can manage peer review assignments" ON public.peer_review_assignments AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['super_admin'::app_role, 'systems_admin'::app_role, 'operations'::app_role, 'programme_manager'::app_role]))))));
CREATE POLICY "Users can view their peer review assignments" ON public.peer_review_assignments AS PERMISSIVE FOR SELECT TO authenticated USING (((reviewer_id = auth.uid()) OR (reviewee_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['super_admin'::app_role, 'systems_admin'::app_role, 'operations'::app_role, 'programme_manager'::app_role, 'assessor'::app_role, 'moderator'::app_role])))))));
CREATE POLICY "Reviewers can manage own reviews" ON public.peer_reviews AS PERMISSIVE FOR ALL TO authenticated USING (((reviewer_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['super_admin'::app_role, 'systems_admin'::app_role, 'operations'::app_role, 'programme_manager'::app_role, 'assessor'::app_role, 'moderator'::app_role])))))));
CREATE POLICY "Admins manage plagiarism checks" ON public.plagiarism_checks AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['super_admin'::app_role, 'systems_admin'::app_role, 'operations'::app_role, 'programme_manager'::app_role]))))));
CREATE POLICY "View plagiarism checks" ON public.plagiarism_checks AS PERMISSIVE FOR SELECT TO authenticated USING (((learner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['super_admin'::app_role, 'systems_admin'::app_role, 'operations'::app_role, 'programme_manager'::app_role, 'assessor'::app_role, 'moderator'::app_role])))))));
CREATE POLICY "Admins manage platform settings" ON public.platform_settings AS PERMISSIVE FOR ALL TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role)));
CREATE POLICY "Authenticated read platform settings" ON public.platform_settings AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Platform admins can manage policy versions" ON public.policy_document_versions AS PERMISSIVE FOR ALL TO authenticated USING ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role)));
CREATE POLICY "All authenticated users can read published policies" ON public.policy_documents AS PERMISSIVE FOR SELECT TO authenticated USING ((status = 'published'::text));
CREATE POLICY "Platform admins can manage policies" ON public.policy_documents AS PERMISSIVE FOR ALL TO authenticated USING ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role)));
CREATE POLICY "Insert proctoring violations" ON public.proctoring_violations AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((learner_id = auth.uid()));
CREATE POLICY "View proctoring violations" ON public.proctoring_violations AS PERMISSIVE FOR SELECT TO authenticated USING (((learner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['super_admin'::app_role, 'systems_admin'::app_role, 'operations'::app_role, 'programme_manager'::app_role, 'assessor'::app_role])))))));
CREATE POLICY "Admins can view all profiles" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Staff can view all profiles" ON public.profiles AS PERMISSIVE FOR SELECT TO public USING ((has_role(auth.uid(), 'facilitator'::app_role) OR has_role(auth.uid(), 'assessor'::app_role) OR has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'mentor'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'talent_manager'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role)));
CREATE POLICY "Users can insert own profile" ON public.profiles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update own profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own profile" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Admins manage programme assessment config" ON public.programme_assessment_config AS PERMISSIVE FOR ALL TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role)));
CREATE POLICY "Authenticated read programme assessment config" ON public.programme_assessment_config AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage completion config" ON public.programme_completion_config AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'programme_manager'::app_role)));
CREATE POLICY "Admins can update completion config" ON public.programme_completion_config AS PERMISSIVE FOR UPDATE TO authenticated USING ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'programme_manager'::app_role)));
CREATE POLICY "Auth users can read completion config" ON public.programme_completion_config AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage enrolment config" ON public.programme_enrolment_config AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'operations'::app_role)));
CREATE POLICY "Admins can update enrolment config" ON public.programme_enrolment_config AS PERMISSIVE FOR UPDATE TO authenticated USING ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'operations'::app_role)));
CREATE POLICY "Auth users can read enrolment config" ON public.programme_enrolment_config AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert audit" ON public.programme_lifecycle_audit AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Authorized roles read audit" ON public.programme_lifecycle_audit AS PERMISSIVE FOR SELECT TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role)));
CREATE POLICY "Admins manage modules" ON public.programme_modules AS PERMISSIVE FOR ALL TO authenticated USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role)));
CREATE POLICY "Authenticated read modules" ON public.programme_modules AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage programme_type_country_mappings" ON public.programme_type_country_mappings AS PERMISSIVE FOR ALL TO authenticated USING ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role))) WITH CHECK ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role)));
CREATE POLICY "Authenticated can read programme_type_country_mappings" ON public.programme_type_country_mappings AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read programme_type_country_mappings" ON public.programme_type_country_mappings AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage programme types" ON public.programme_types AS PERMISSIVE FOR ALL TO authenticated USING ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role))) WITH CHECK ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role)));
CREATE POLICY "Anyone can read programme types" ON public.programme_types AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can read programme types" ON public.programme_types AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins full access programmes" ON public.programmes AS PERMISSIVE FOR ALL TO authenticated USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role)));
CREATE POLICY "Authenticated read programmes" ON public.programmes AS PERMISSIVE FOR SELECT TO authenticated USING (((status = ANY (ARRAY['active'::text, 'published'::text, 'approved'::text])) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role) OR has_role(auth.uid(), 'assessor'::app_role) OR has_role(auth.uid(), 'moderator'::app_role) OR (EXISTS ( SELECT 1
   FROM (enrolments e
     JOIN cohorts c ON ((c.id = e.cohort_id)))
  WHERE ((c.programme_id = programmes.id) AND (e.learner_id = auth.uid()))))));
CREATE POLICY "Sponsors can read sponsored programmes" ON public.programmes AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM (cohorts c
     JOIN enrolments e ON ((e.cohort_id = c.id)))
  WHERE ((c.programme_id = programmes.id) AND (e.sponsor_id = auth.uid())))));
CREATE POLICY "Admins can manage qualification_frameworks" ON public.qualification_frameworks AS PERMISSIVE FOR ALL TO authenticated USING ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role))) WITH CHECK ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role)));
CREATE POLICY "Authenticated can read qualification_frameworks" ON public.qualification_frameworks AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read qualification_frameworks" ON public.qualification_frameworks AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage qualification_levels" ON public.qualification_levels AS PERMISSIVE FOR ALL TO authenticated USING ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role))) WITH CHECK ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role)));
CREATE POLICY "Authenticated can read qualification_levels" ON public.qualification_levels AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read qualification_levels" ON public.qualification_levels AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read question_bank_items" ON public.question_bank_items AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage question_bank_items" ON public.question_bank_items AS PERMISSIVE FOR ALL TO authenticated USING ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role)));
CREATE POLICY "Authenticated can read question_banks" ON public.question_banks AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage question_banks" ON public.question_banks AS PERMISSIVE FOR ALL TO authenticated USING ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role)));
CREATE POLICY "Authenticated can read quiz_options" ON public.quiz_options AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage quiz_options" ON public.quiz_options AS PERMISSIVE FOR ALL TO authenticated USING ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role)));
CREATE POLICY "Authenticated can read quiz_questions" ON public.quiz_questions AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage quiz_questions" ON public.quiz_questions AS PERMISSIVE FOR ALL TO authenticated USING ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role)));
CREATE POLICY "Learners can insert own quiz_responses" ON public.quiz_responses AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM assessment_submissions s
  WHERE ((s.id = quiz_responses.submission_id) AND (s.learner_id = auth.uid())))));
CREATE POLICY "Learners can read own quiz_responses" ON public.quiz_responses AS PERMISSIVE FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM assessment_submissions s
  WHERE ((s.id = quiz_responses.submission_id) AND (s.learner_id = auth.uid())))) OR is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'assessor'::app_role)));
CREATE POLICY "Admins manage approval steps" ON public.registration_approval_steps AS PERMISSIVE FOR ALL TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role)));
CREATE POLICY "Assigned approvers can read their steps" ON public.registration_approval_steps AS PERMISSIVE FOR SELECT TO public USING ((approver_user_id = auth.uid()));
CREATE POLICY "Assigned approvers can update their steps" ON public.registration_approval_steps AS PERMISSIVE FOR UPDATE TO public USING ((approver_user_id = auth.uid()));
CREATE POLICY "Admins can manage regulatory_bodies" ON public.regulatory_bodies AS PERMISSIVE FOR ALL TO authenticated USING ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role))) WITH CHECK ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role)));
CREATE POLICY "Authenticated can read regulatory_bodies" ON public.regulatory_bodies AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read regulatory_bodies" ON public.regulatory_bodies AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage reporting_mandates" ON public.reporting_mandates AS PERMISSIVE FOR ALL TO authenticated USING ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role))) WITH CHECK ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role)));
CREATE POLICY "Authenticated can read reporting_mandates" ON public.reporting_mandates AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read reporting_mandates" ON public.reporting_mandates AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins read role audit log" ON public.role_audit_log AS PERMISSIVE FOR SELECT TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role)));
CREATE POLICY "System insert role audit log" ON public.role_audit_log AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Admins manage role definitions" ON public.role_definitions AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Authenticated read role definitions" ON public.role_definitions AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Admins manage role permissions" ON public.role_permissions AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Authenticated read role permissions" ON public.role_permissions AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can read rubric_criteria" ON public.rubric_criteria AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage rubric_criteria" ON public.rubric_criteria AS PERMISSIVE FOR ALL TO authenticated USING ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role) OR has_role(auth.uid(), 'assessor'::app_role)));
CREATE POLICY "Authenticated can read rubrics" ON public.rubrics AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage rubrics" ON public.rubrics AS PERMISSIVE FOR ALL TO authenticated USING ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role) OR has_role(auth.uid(), 'assessor'::app_role)));
CREATE POLICY "Platform admins can manage incidents" ON public.security_incidents AS PERMISSIVE FOR ALL TO authenticated USING ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role)));
CREATE POLICY "Reporter can view own incidents" ON public.security_incidents AS PERMISSIVE FOR SELECT TO authenticated USING ((reported_by = auth.uid()));
CREATE POLICY "Admins manage all attendance" ON public.session_attendance AS PERMISSIVE FOR ALL TO authenticated USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role)));
CREATE POLICY "Learners self check-in" ON public.session_attendance AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((learner_id = auth.uid()));
CREATE POLICY "Learners update own attendance" ON public.session_attendance AS PERMISSIVE FOR UPDATE TO authenticated USING ((learner_id = auth.uid()));
CREATE POLICY "Learners view own attendance" ON public.session_attendance AS PERMISSIVE FOR SELECT TO authenticated USING ((learner_id = auth.uid()));
CREATE POLICY "Admins delete session chat" ON public.session_chat_messages AS PERMISSIVE FOR DELETE TO authenticated USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role)));
CREATE POLICY "Authenticated insert session chat" ON public.session_chat_messages AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Authenticated read session chat" ON public.session_chat_messages AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated create notes" ON public.session_notes AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = author_id));
CREATE POLICY "Authenticated read shared notes" ON public.session_notes AS PERMISSIVE FOR SELECT TO authenticated USING (((is_shared = true) OR (author_id = auth.uid())));
CREATE POLICY "Authors delete own notes" ON public.session_notes AS PERMISSIVE FOR DELETE TO authenticated USING ((author_id = auth.uid()));
CREATE POLICY "Authors update own notes" ON public.session_notes AS PERMISSIVE FOR UPDATE TO authenticated USING ((author_id = auth.uid()));
CREATE POLICY "Staff manage all notes" ON public.session_notes AS PERMISSIVE FOR ALL TO authenticated USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role)));
CREATE POLICY "Admins can delete shared content" ON public.shared_content_items AS PERMISSIVE FOR DELETE TO authenticated USING (is_platform_admin(auth.uid()));
CREATE POLICY "Authenticated users can read published shared content" ON public.shared_content_items AS PERMISSIVE FOR SELECT TO authenticated USING (((status = 'published'::text) OR (created_by = auth.uid()) OR is_platform_admin(auth.uid())));
CREATE POLICY "Creators and admins can insert shared content" ON public.shared_content_items AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((auth.uid() = created_by) OR is_platform_admin(auth.uid())));
CREATE POLICY "Creators and admins can update shared content" ON public.shared_content_items AS PERMISSIVE FOR UPDATE TO authenticated USING (((created_by = auth.uid()) OR is_platform_admin(auth.uid())));
CREATE POLICY "Auth users can insert shared content versions" ON public.shared_content_versions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can read shared content versions" ON public.shared_content_versions AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone authenticated can read skills" ON public.skills AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Platform admins can manage skills" ON public.skills AS PERMISSIVE FOR ALL TO authenticated USING (is_platform_admin(auth.uid())) WITH CHECK (is_platform_admin(auth.uid()));
CREATE POLICY "Admins manage all evidence" ON public.sponsor_compliance_evidence AS PERMISSIVE FOR ALL TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role)));
CREATE POLICY "Sponsors see own evidence" ON public.sponsor_compliance_evidence AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM sponsor_compliance_records r
  WHERE ((r.id = sponsor_compliance_evidence.record_id) AND (r.sponsor_id = auth.uid())))));
CREATE POLICY "Sponsors upload own evidence" ON public.sponsor_compliance_evidence AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM sponsor_compliance_records r
  WHERE ((r.id = sponsor_compliance_evidence.record_id) AND (r.sponsor_id = auth.uid())))));
CREATE POLICY "Admins manage compliance frameworks" ON public.sponsor_compliance_frameworks AS PERMISSIVE FOR ALL TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role)));
CREATE POLICY "Authenticated read compliance frameworks" ON public.sponsor_compliance_frameworks AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Admins manage compliance indicators" ON public.sponsor_compliance_indicators AS PERMISSIVE FOR ALL TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role)));
CREATE POLICY "Authenticated read compliance indicators" ON public.sponsor_compliance_indicators AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Admins manage all compliance records" ON public.sponsor_compliance_records AS PERMISSIVE FOR ALL TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role)));
CREATE POLICY "Sponsors see own compliance records" ON public.sponsor_compliance_records AS PERMISSIVE FOR SELECT TO public USING ((sponsor_id = auth.uid()));
CREATE POLICY "Admins manage all reports" ON public.sponsor_compliance_reports AS PERMISSIVE FOR ALL TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role)));
CREATE POLICY "Sponsors see own reports" ON public.sponsor_compliance_reports AS PERMISSIVE FOR SELECT TO public USING ((sponsor_id = auth.uid()));
CREATE POLICY "Admins manage sponsor invitations" ON public.sponsor_invitations AS PERMISSIVE FOR ALL TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role)));
CREATE POLICY "Authenticated read invitations" ON public.sponsor_invitations AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage invoices" ON public.sponsor_invoices AS PERMISSIVE FOR ALL TO authenticated USING ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role)));
CREATE POLICY "Sponsors view own invoices" ON public.sponsor_invoices AS PERMISSIVE FOR SELECT TO authenticated USING (((sponsor_id = auth.uid()) OR is_platform_admin(auth.uid())));
CREATE POLICY "Recipients mark as read" ON public.sponsor_messages AS PERMISSIVE FOR UPDATE TO authenticated USING ((recipient_id = auth.uid()));
CREATE POLICY "Users send messages" ON public.sponsor_messages AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((sender_id = auth.uid()));
CREATE POLICY "Users view own messages" ON public.sponsor_messages AS PERMISSIVE FOR SELECT TO authenticated USING (((sender_id = auth.uid()) OR (recipient_id = auth.uid())));
CREATE POLICY "Admins manage sponsor profiles" ON public.sponsor_profiles AS PERMISSIVE FOR ALL TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role)));
CREATE POLICY "Sponsors insert own profile" ON public.sponsor_profiles AS PERMISSIVE FOR INSERT TO public WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Sponsors read own profile" ON public.sponsor_profiles AS PERMISSIVE FOR SELECT TO public USING ((user_id = auth.uid()));
CREATE POLICY "Sponsors update own profile" ON public.sponsor_profiles AS PERMISSIVE FOR UPDATE TO public USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Admins manage sponsor links" ON public.sponsor_programme_links AS PERMISSIVE FOR ALL TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role)));
CREATE POLICY "Sponsors read own links" ON public.sponsor_programme_links AS PERMISSIVE FOR SELECT TO public USING ((sponsor_id = auth.uid()));
CREATE POLICY "Staff can insert quotes" ON public.sponsor_quotes AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((is_platform_admin(auth.uid()) OR has_permission(auth.uid(), 'programme'::text, 'create'::text) OR (created_by = auth.uid())));
CREATE POLICY "Staff can update quotes" ON public.sponsor_quotes AS PERMISSIVE FOR UPDATE TO authenticated USING (((sponsor_id = auth.uid()) OR is_platform_admin(auth.uid()) OR has_permission(auth.uid(), 'programme'::text, 'approve'::text)));
CREATE POLICY "Users can view own quotes" ON public.sponsor_quotes AS PERMISSIVE FOR SELECT TO authenticated USING (((sponsor_id = auth.uid()) OR is_platform_admin(auth.uid()) OR has_permission(auth.uid(), 'programme'::text, 'approve'::text)));
CREATE POLICY "Admins manage all expenditures" ON public.sponsor_sd_expenditures AS PERMISSIVE FOR ALL TO public USING (is_platform_admin(auth.uid()));
CREATE POLICY "Sponsors manage own expenditures" ON public.sponsor_sd_expenditures AS PERMISSIVE FOR ALL TO public USING ((sponsor_id = auth.uid())) WITH CHECK ((sponsor_id = auth.uid()));
CREATE POLICY "Admins manage all SD profiles" ON public.sponsor_sd_profiles AS PERMISSIVE FOR ALL TO public USING (is_platform_admin(auth.uid()));
CREATE POLICY "Sponsors manage own SD profiles" ON public.sponsor_sd_profiles AS PERMISSIVE FOR ALL TO public USING ((sponsor_id = auth.uid())) WITH CHECK ((sponsor_id = auth.uid()));
CREATE POLICY "Admins manage all checklists" ON public.sponsor_seta_checklist AS PERMISSIVE FOR ALL TO public USING (is_platform_admin(auth.uid()));
CREATE POLICY "Sponsors manage own checklist" ON public.sponsor_seta_checklist AS PERMISSIVE FOR ALL TO public USING ((sponsor_id = auth.uid())) WITH CHECK ((sponsor_id = auth.uid()));
CREATE POLICY "Staff admins manage document requests" ON public.staff_document_requests AS PERMISSIVE FOR ALL TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role)));
CREATE POLICY "Admins and ops manage staff registrations" ON public.staff_registrations AS PERMISSIVE FOR ALL TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role)));
CREATE POLICY "Programme managers can view staff registrations" ON public.staff_registrations AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'programme_manager'::app_role));
CREATE POLICY "Admins can delete staff role assignments" ON public.staff_role_assignments AS PERMISSIVE FOR DELETE TO authenticated USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role)));
CREATE POLICY "Admins can insert staff role assignments" ON public.staff_role_assignments AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role)));
CREATE POLICY "Admins can update staff role assignments" ON public.staff_role_assignments AS PERMISSIVE FOR UPDATE TO authenticated USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role)));
CREATE POLICY "Authenticated users can read staff role assignments" ON public.staff_role_assignments AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff managers can delete role assignments" ON public.staff_role_assignments AS PERMISSIVE FOR DELETE TO authenticated USING (true);
CREATE POLICY "Staff managers can insert role assignments" ON public.staff_role_assignments AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff managers can update role assignments" ON public.staff_role_assignments AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Programme managers read verification items" ON public.staff_verification_items AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'programme_manager'::app_role));
CREATE POLICY "Staff admins manage verification items" ON public.staff_verification_items AS PERMISSIVE FOR ALL TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role)));
CREATE POLICY "Admins manage settings" ON public.system_settings AS PERMISSIVE FOR ALL TO authenticated USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role)));
CREATE POLICY "Authenticated can read settings" ON public.system_settings AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert audit logs" ON public.tenant_audit_log AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((tenant_id IN ( SELECT get_user_tenant_ids(auth.uid()) AS get_user_tenant_ids)));
CREATE POLICY "Platform admins can view all audit logs" ON public.tenant_audit_log AS PERMISSIVE FOR ALL TO authenticated USING (is_platform_admin(auth.uid()));
CREATE POLICY "Tenant admins can view their audit logs" ON public.tenant_audit_log AS PERMISSIVE FOR SELECT TO authenticated USING (is_tenant_admin(auth.uid(), tenant_id));
CREATE POLICY "Platform admins can manage all feature flags" ON public.tenant_feature_flags AS PERMISSIVE FOR ALL TO authenticated USING (is_platform_admin(auth.uid()));
CREATE POLICY "Tenant members can view their flags" ON public.tenant_feature_flags AS PERMISSIVE FOR SELECT TO authenticated USING ((tenant_id IN ( SELECT get_user_tenant_ids(auth.uid()) AS get_user_tenant_ids)));
CREATE POLICY "Platform admins can manage all tenant users" ON public.tenant_users AS PERMISSIVE FOR ALL TO authenticated USING (is_platform_admin(auth.uid()));
CREATE POLICY "Tenant admins can manage their tenant users" ON public.tenant_users AS PERMISSIVE FOR ALL TO authenticated USING (is_tenant_admin(auth.uid(), tenant_id));
CREATE POLICY "Users can view their own tenant memberships" ON public.tenant_users AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Platform admins can manage all tenants" ON public.tenants AS PERMISSIVE FOR ALL TO authenticated USING (is_platform_admin(auth.uid()));
CREATE POLICY "Tenant members can view their tenant" ON public.tenants AS PERMISSIVE FOR SELECT TO authenticated USING ((id IN ( SELECT get_user_tenant_ids(auth.uid()) AS get_user_tenant_ids)));
CREATE POLICY "Admins manage all sessions" ON public.training_sessions AS PERMISSIVE FOR ALL TO authenticated USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role)));
CREATE POLICY "Authenticated users read sessions" ON public.training_sessions AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Facilitators manage own sessions" ON public.training_sessions AS PERMISSIVE FOR ALL TO authenticated USING (((facilitator_id = auth.uid()) OR (created_by = auth.uid()))) WITH CHECK (((facilitator_id = auth.uid()) OR (created_by = auth.uid())));
CREATE POLICY "Admins manage typography" ON public.typography_assignments AS PERMISSIVE FOR ALL TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role)));
CREATE POLICY "Public read published typography" ON public.typography_assignments AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Admins manage presets" ON public.typography_presets AS PERMISSIVE FOR ALL TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role)));
CREATE POLICY "Public read presets" ON public.typography_presets AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can create UGC" ON public.user_generated_content AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((author_id = auth.uid()));
CREATE POLICY "Authenticated can read published UGC" ON public.user_generated_content AS PERMISSIVE FOR SELECT TO authenticated USING (((status = 'published'::text) OR (author_id = auth.uid()) OR is_platform_admin(auth.uid()) OR has_permission(auth.uid(), 'programme'::text, 'create'::text)));
CREATE POLICY "Authors can delete own pending UGC" ON public.user_generated_content AS PERMISSIVE FOR DELETE TO authenticated USING (((author_id = auth.uid()) AND (status = 'pending'::text)));
CREATE POLICY "Authors can update own UGC" ON public.user_generated_content AS PERMISSIVE FOR UPDATE TO authenticated USING (((author_id = auth.uid()) OR is_platform_admin(auth.uid()) OR has_permission(auth.uid(), 'programme'::text, 'create'::text)));
CREATE POLICY "Admins manage user role scopes" ON public.user_role_scopes AS PERMISSIVE FOR ALL TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role)));
CREATE POLICY "Users see own scopes" ON public.user_role_scopes AS PERMISSIVE FOR SELECT TO public USING ((user_id = auth.uid()));
CREATE POLICY "Admins can manage roles" ON public.user_roles AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Admins can view all roles" ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Users can view own roles" ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Staff manage verification checklist" ON public.verification_checklist_items AS PERMISSIVE FOR ALL TO public USING ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role) OR has_role(auth.uid(), 'assessor'::app_role))) WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role) OR has_role(auth.uid(), 'facilitator'::app_role) OR has_role(auth.uid(), 'assessor'::app_role)));
CREATE POLICY "Insert workflow_audit_log" ON public.workflow_audit_log AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Read workflow_audit_log" ON public.workflow_audit_log AS PERMISSIVE FOR SELECT TO authenticated USING ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role)));
CREATE POLICY "Read workflow_instances" ON public.workflow_instances AS PERMISSIVE FOR SELECT TO authenticated USING ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role) OR (started_by = auth.uid())));
CREATE POLICY "Write workflow_instances" ON public.workflow_instances AS PERMISSIVE FOR ALL TO authenticated USING ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role))) WITH CHECK ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role)));
CREATE POLICY "Read workflow_step_instances" ON public.workflow_step_instances AS PERMISSIVE FOR SELECT TO authenticated USING ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role) OR (assigned_to = auth.uid())));
CREATE POLICY "Write workflow_step_instances" ON public.workflow_step_instances AS PERMISSIVE FOR ALL TO authenticated USING ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role) OR (assigned_to = auth.uid()))) WITH CHECK ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role) OR (assigned_to = auth.uid())));
CREATE POLICY "Admin read workflow_steps" ON public.workflow_steps AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM workflow_templates wt
  WHERE ((wt.id = workflow_steps.template_id) AND (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role))))));
CREATE POLICY "Admin write workflow_steps" ON public.workflow_steps AS PERMISSIVE FOR ALL TO authenticated USING ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role))) WITH CHECK ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role)));
CREATE POLICY "Admin read workflow_templates" ON public.workflow_templates AS PERMISSIVE FOR SELECT TO authenticated USING ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role)));
CREATE POLICY "Admin write workflow_templates" ON public.workflow_templates AS PERMISSIVE FOR ALL TO authenticated USING ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role))) WITH CHECK ((is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role)));
CREATE POLICY "Admins see all evidence" ON public.workplace_evidence AS PERMISSIVE FOR SELECT TO authenticated USING (is_platform_admin(auth.uid()));
CREATE POLICY "Learners and reviewers can access evidence" ON public.workplace_evidence AS PERMISSIVE FOR ALL TO authenticated USING (((learner_id = auth.uid()) OR (reviewed_by = auth.uid())));

-- ── REALTIME ──────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.approval_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assessment_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_blocks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_ratings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.directory_oversight_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussion_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.enrolments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.learner_registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.learning_recommendations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mentor_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.moderation_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sponsor_compliance_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sponsor_compliance_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sponsor_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sponsor_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sponsor_programme_links;
ALTER PUBLICATION supabase_realtime ADD TABLE public.training_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_generated_content;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_instances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_step_instances;

-- ── END OF SCHEMA ────────────────────────────────────────