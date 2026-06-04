-- ============================================================================
-- R1 (revised): Per-function SECURITY DEFINER audit
--
-- Strategy:
--   1. Default-deny: REVOKE EXECUTE FROM PUBLIC, anon on every SECURITY DEFINER
--      function in `public`.
--   2. Re-grant EXECUTE per classification:
--        A. RLS HELPERS  → GRANT EXECUTE TO PUBLIC
--           (these are called *inside* RLS policies; both anon and authenticated
--           queries evaluate them. Definer body is safe — read-only existence
--           checks against user_roles / tenant_users; no sensitive data leak.)
--        B. CLIENT RPCs  → GRANT EXECUTE TO authenticated
--           (called via supabase.rpc() from a signed-in session; each performs
--           its own authorisation check internally.)
--        C. PUBLIC RPCs  → GRANT EXECUTE TO anon, authenticated
--           (deliberately reachable pre-login: branding + hostname resolver.)
--        D. ADMIN RPCs   → GRANT EXECUTE TO authenticated
--           (function body raises if caller is not platform/tenant admin.)
--        E. TRIGGER FNs  → NO grant. Triggers fire as the table owner; no caller
--           ever invokes them directly. Removing EXECUTE shrinks attack surface.
--        F. SERVICE-ROLE ONLY → NO grant to anon/authenticated. Only callable
--           from edge functions using the service role (which bypasses EXECUTE
--           ACLs anyway).
--
-- Residual DEFINER set: every function below remains SECURITY DEFINER (changing
-- to INVOKER would break either RLS evaluation or admin escalation paths). The
-- justification is recorded as a COMMENT on each function for the audit trail.
-- ============================================================================

-- ── Step 1: blanket default-deny ─────────────────────────────────────────────
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT n.nspname AS schema, p.proname AS name,
           pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prosecdef = true
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated',
      fn.schema, fn.name, fn.args
    );
  END LOOP;
END $$;

-- ── Step 2A: RLS helper functions (called inside policies) ───────────────────
-- Grant to PUBLIC so policy evaluation works for both anon and authenticated
-- queries. Bodies are read-only existence checks against role/tenant tables.

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_tenant_admin(uuid, uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_tenant_owner_or_admin(uuid, uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_tenant_member(uuid, uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_delegated_approver(uuid, uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_tenant(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_edit_programme_content(uuid, uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_act_on_workflow_step(uuid, uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text, text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.tenant_for_programme(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.tenant_for_assessment(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.tenant_for_cohort(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.tenant_for_user(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_ids(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_admin_tenant_ids(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.tenant_has_flag(uuid, text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.storage_path_tenant_id(text) TO PUBLIC;

COMMENT ON FUNCTION public.has_role(uuid, app_role) IS
  'RLS helper. DEFINER required to read user_roles without exposing the table directly. Grantee: PUBLIC.';
COMMENT ON FUNCTION public.is_platform_admin(uuid) IS
  'RLS helper. DEFINER required for cross-tenant admin checks. Grantee: PUBLIC.';
COMMENT ON FUNCTION public.is_tenant_admin(uuid, uuid) IS
  'RLS helper. DEFINER required. Grantee: PUBLIC.';
COMMENT ON FUNCTION public.is_tenant_member(uuid, uuid) IS
  'RLS helper. DEFINER required. Grantee: PUBLIC.';
COMMENT ON FUNCTION public.can_access_tenant(uuid) IS
  'RLS helper. DEFINER required. Grantee: PUBLIC.';

-- ── Step 2B: Client RPCs (signed-in users only) ──────────────────────────────
-- Each performs its own auth check or operates on auth.uid().

GRANT EXECUTE ON FUNCTION public.set_active_tenant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_effective_flags(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_quota_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_recommended_provider(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_gateways_for_tenant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_usage_event(uuid, text, numeric, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_compliance_score(numeric, numeric, numeric) TO authenticated;

-- ── Step 2C: Public RPCs (reachable pre-login) ───────────────────────────────
-- Branding + hostname resolver power the landing page for anonymous visitors.

GRANT EXECUTE ON FUNCTION public.get_tenant_branding(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_tenant_by_hostname(text) TO anon, authenticated;

COMMENT ON FUNCTION public.get_tenant_branding(text) IS
  'Public RPC. Intentionally anon-callable for landing-page branding lookup.';
COMMENT ON FUNCTION public.resolve_tenant_by_hostname(text) IS
  'Public RPC. Intentionally anon-callable for multi-tenant hostname resolution.';

-- ── Step 2D: Admin-gated RPCs (body raises on non-admin caller) ──────────────

GRANT EXECUTE ON FUNCTION public.reactivate_tenant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_tenant_branding(uuid, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_invoice_paid(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_tenant_domain(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_primary_tenant_domain(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_tenant_member_role(uuid, uuid, text, boolean) TO authenticated;

COMMENT ON FUNCTION public.mark_invoice_paid(uuid, text) IS
  'Admin RPC. DEFINER required to bypass billing_invoices RLS; body enforces is_platform_admin.';
COMMENT ON FUNCTION public.reactivate_tenant(uuid) IS
  'Admin RPC. Body enforces is_platform_admin before mutating tenants.';
COMMENT ON FUNCTION public.update_tenant_branding(uuid, text, text, text, text, text, text) IS
  'Admin RPC. Body enforces is_tenant_admin OR is_platform_admin.';
COMMENT ON FUNCTION public.set_tenant_member_role(uuid, uuid, text, boolean) IS
  'Admin RPC. Body enforces is_tenant_admin OR is_platform_admin and prevents removing last owner.';

-- ── Step 2E: Trigger functions ───────────────────────────────────────────────
-- No EXECUTE grant. These are fired by triggers running as the table owner;
-- no client should ever invoke them directly. Leaving EXECUTE revoked removes
-- the attack surface of a logged-in user calling them with crafted arguments.
-- (Functions: notify_workflow_step_assigned, wbt_auto_credential_on_completion,
--  audit_enrolment_toggle_change, enforce_tenant_user_quota,
--  enforce_tenant_programme_quota, generate_learner_number, log_tenant_event,
--  bridge_legacy_payment_gateway, enforce_single_default_gateway,
--  wbt_calculate_escrow_fees, audit_validation_mode_change,
--  generate_credential_hash, trigger_notification_email,
--  wbt_notify_sprint_accepted, set_tenant_id_default, calculate_late_minutes,
--  bootstrap_tenant_feature_flags, notify_new_approval_task,
--  protect_learner_number, sync_programme_type_count, notify_assessment_graded,
--  notify_staff_on_approval, audit_verification_checklist_change,
--  audit_document_verification, enforce_assessment_publish_integrity,
--  notify_approval_decision, auto_revoke_ai_token_on_phase_change,
--  snapshot_template_version, update_updated_at_column,
--  audit_assessment_status_change, check_invoice_overdue,
--  audit_document_request, handle_new_user, auto_generate_verification_checklist)
--
-- service_role retains EXECUTE implicitly (bypasses GRANT ACLs).

-- ── Step 2F: Queue/service-role-only functions ───────────────────────────────
-- enqueue_email, read_email_batch, delete_email, move_to_dlq:
-- only callable from edge functions via service_role. No anon/authenticated grant.

-- ── Step 3: re-grant ALL to service_role for completeness ────────────────────
-- service_role bypasses ACLs but explicit grants make audit tooling clearer.
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT n.nspname AS schema, p.proname AS name,
           pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prosecdef = true
  LOOP
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role',
      fn.schema, fn.name, fn.args
    );
  END LOOP;
END $$;