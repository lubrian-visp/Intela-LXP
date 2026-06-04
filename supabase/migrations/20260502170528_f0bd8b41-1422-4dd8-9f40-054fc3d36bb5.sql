CREATE OR REPLACE FUNCTION public.get_platform_analytics()
RETURNS TABLE (
  tenant_id UUID,
  tenant_name TEXT,
  tenant_slug TEXT,
  status TEXT,
  subscription_tier TEXT,
  max_users INTEGER,
  max_programmes INTEGER,
  active_members BIGINT,
  pending_invitations BIGINT,
  custom_domains BIGINT,
  verified_domains BIGINT,
  total_programmes BIGINT,
  active_programmes BIGINT,
  total_enrolments BIGINT,
  active_enrolments BIGINT,
  submissions_30d BIGINT,
  created_at TIMESTAMPTZ,
  health_score INTEGER
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'systems_admin')) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      t.id, t.name, t.slug, t.status, t.subscription_tier, t.max_users, t.max_programmes, t.created_at,
      (SELECT COUNT(*) FROM tenant_users tu WHERE tu.tenant_id = t.id AND tu.is_active = true) AS active_members,
      (SELECT COUNT(*) FROM tenant_invitations ti WHERE ti.tenant_id = t.id AND ti.accepted_at IS NULL AND ti.expires_at > now()) AS pending_invitations,
      (SELECT COUNT(*) FROM tenant_domains td WHERE td.tenant_id = t.id) AS custom_domains,
      (SELECT COUNT(*) FROM tenant_domains td WHERE td.tenant_id = t.id AND td.status = 'verified') AS verified_domains,
      (SELECT COUNT(*) FROM programmes p WHERE p.tenant_id = t.id) AS total_programmes,
      (SELECT COUNT(*) FROM programmes p WHERE p.tenant_id = t.id AND p.status = 'active') AS active_programmes,
      (SELECT COUNT(*) FROM enrolments e WHERE e.tenant_id = t.id) AS total_enrolments,
      (SELECT COUNT(*) FROM enrolments e WHERE e.tenant_id = t.id AND e.status = 'active') AS active_enrolments,
      (SELECT COUNT(*) FROM assessment_submissions s WHERE s.tenant_id = t.id AND s.created_at > now() - interval '30 days') AS submissions_30d
    FROM tenants t
  )
  SELECT
    b.id, b.name, b.slug, b.status, b.subscription_tier, b.max_users, b.max_programmes,
    b.active_members, b.pending_invitations, b.custom_domains, b.verified_domains,
    b.total_programmes, b.active_programmes, b.total_enrolments, b.active_enrolments, b.submissions_30d,
    b.created_at,
    -- Health score: quota headroom + recent activity + verified domain
    LEAST(100, GREATEST(0,
      CASE WHEN b.status <> 'active' THEN 0 ELSE 40 END
      + CASE WHEN b.max_users IS NULL OR b.max_users = 0 THEN 20
             WHEN b.active_members::float / NULLIF(b.max_users,0) < 0.9 THEN 20
             WHEN b.active_members::float / NULLIF(b.max_users,0) < 1.0 THEN 10
             ELSE 0 END
      + CASE WHEN b.submissions_30d > 0 OR b.active_enrolments > 0 THEN 25 ELSE 0 END
      + CASE WHEN b.verified_domains > 0 THEN 15 ELSE 0 END
    ))::INTEGER AS health_score
  FROM base b
  ORDER BY b.active_members DESC, b.name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_analytics() TO authenticated;
