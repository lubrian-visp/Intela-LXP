
-- Create platform_settings table for editable key-value config
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  label text NOT NULL,
  description text,
  setting_type text NOT NULL DEFAULT 'text', -- text, color, toggle, select
  is_editable boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage platform settings"
  ON public.platform_settings FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'systems_admin'::app_role));

CREATE POLICY "Authenticated read platform settings"
  ON public.platform_settings FOR SELECT
  USING (true);

-- Seed platform settings
INSERT INTO public.platform_settings (setting_key, setting_value, category, label, description, setting_type) VALUES
  ('platform_name', 'Qualify LMS', 'general', 'Platform Name', 'The display name of the platform', 'text'),
  ('default_timezone', 'Africa/Johannesburg', 'general', 'Default Timezone', 'Default timezone for dates and scheduling', 'text'),
  ('default_language', 'en-ZA', 'general', 'Default Language', 'Primary language for the platform', 'text'),
  ('date_format', 'DD/MM/YYYY', 'general', 'Date Format', 'How dates are displayed throughout the platform', 'text'),
  ('default_currency', 'ZAR', 'general', 'Currency', 'Default currency for payments and invoicing', 'text'),
  ('support_email', 'support@qualify.co.za', 'general', 'Support Email', 'Primary support contact email', 'text'),
  ('primary_color', '#1e3a5f', 'branding', 'Primary Color', 'Main brand color', 'color'),
  ('accent_color', '#e89a1d', 'branding', 'Accent Color', 'Accent highlight color', 'color'),
  ('logo_url', '/assets/logo.svg', 'branding', 'Logo URL', 'Path to platform logo', 'text'),
  ('favicon_url', '/favicon.ico', 'branding', 'Favicon', 'Browser tab icon', 'text'),
  ('login_background', 'gradient', 'branding', 'Login Background', 'Authentication page background style', 'text');

-- Seed feature flags for auth and security settings
INSERT INTO public.feature_flags (flag_key, is_enabled, description) VALUES
  ('auth_email_password', true, 'Standard email/password authentication'),
  ('auth_magic_link', true, 'Passwordless email login'),
  ('auth_google_sso', false, 'Sign in with Google workspace'),
  ('auth_saml', false, 'Enterprise SSO via SAML 2.0'),
  ('auth_mfa', true, 'TOTP-based two-factor authentication'),
  ('security_rls', true, 'Row Level Security on all tables'),
  ('security_rate_limiting', true, 'Rate limiting at 100 req/min per user'),
  ('security_audit_logging', true, 'All mutations tracked in audit log'),
  ('security_ddos', true, 'DDoS protection via CDN'),
  ('security_encryption', true, 'AES-256 encryption at rest'),
  ('security_ip_allowlist', false, 'IP allowlisting for admin access'),
  ('compliance_gdpr', true, 'GDPR data controls'),
  ('compliance_iso19796', true, 'ISO/IEC 19796 alignment'),
  ('compliance_data_retention', true, 'Data retention policy enforcement'),
  ('compliance_consent', false, 'Consent management framework'),
  ('compliance_erasure', true, 'Right to erasure implementation'),
  ('compliance_dpia', false, 'Data Protection Impact Assessment'),
  ('notif_enrolment_confirm', true, 'Learner enrolment confirmation email'),
  ('notif_assessment_submit', true, 'Assessment submission alert'),
  ('notif_module_complete', true, 'Module completion in-app notification'),
  ('notif_cohort_reminder', true, 'Cohort start reminder email'),
  ('notif_cert_issued', false, 'Certificate issued email + SMS'),
  ('notif_facilitator_assign', true, 'Facilitator assignment email')
ON CONFLICT (flag_key) DO NOTHING;

-- Trigger for updated_at on platform_settings
CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
