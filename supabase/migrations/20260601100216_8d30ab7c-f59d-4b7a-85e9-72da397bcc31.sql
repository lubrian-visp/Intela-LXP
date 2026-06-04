-- =========================================================
-- R4 quick-wins: indexes + consolidated platform-stats RPC
-- =========================================================

-- 1. Indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_enrolments_learner_id
  ON public.enrolments (learner_id);

CREATE INDEX IF NOT EXISTS idx_assessment_submissions_assessor_id
  ON public.assessment_submissions (assessor_id);

-- unified_audit_log is a UNION ALL view; index each underlying base table
CREATE INDEX IF NOT EXISTS idx_onboarding_audit_log_created_at
  ON public.onboarding_audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_deletion_audit_log_created_at
  ON public.deletion_audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_programme_lifecycle_audit_created_at
  ON public.programme_lifecycle_audit (created_at DESC);

-- 2. Consolidated platform stats RPC — replaces 7 parallel HEAD counts
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not_authorised' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'totalUsers',         (SELECT count(*) FROM public.profiles),
    'totalRoles',         (SELECT count(*) FROM public.user_roles),
    'totalProgrammes',    (SELECT count(*) FROM public.programmes),
    'totalEnrolments',    (SELECT count(*) FROM public.enrolments),
    'totalSettings',      (SELECT count(*) FROM public.platform_settings),
    'totalNotifications', (SELECT count(*) FROM public.notifications),
    'featureFlags',       COALESCE((SELECT jsonb_agg(to_jsonb(f)) FROM public.feature_flags f), '[]'::jsonb)
  )
  INTO result;

  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_platform_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO authenticated, service_role;