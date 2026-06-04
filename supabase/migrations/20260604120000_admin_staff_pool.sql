-- ============================================================
-- Admin Staff Pool
-- ============================================================
-- Tables: admin_pool_config, admin_pool_members, admin_allocations
-- Trigger: auto-add approved admin staff to pool
-- RLS: role-based access based on privilege_level
-- ============================================================

-- ── 1. Pool configuration (fully dynamic – no hardcoded roles) ──────────────
CREATE TABLE IF NOT EXISTS public.admin_pool_config (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key              text NOT NULL UNIQUE,
  display_name          text NOT NULL,
  privilege_level       integer NOT NULL DEFAULT 1,
  can_allocate          boolean NOT NULL DEFAULT false,
  is_pool_eligible      boolean NOT NULL DEFAULT true,
  requires_approval     boolean NOT NULL DEFAULT false,
  approval_assigned_role text,                          -- role_key that must approve
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ── 2. Pool members ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_pool_members (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_registration_id   uuid REFERENCES public.staff_registrations(id) ON DELETE SET NULL,
  user_id                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_key                text NOT NULL REFERENCES public.admin_pool_config(role_key) ON DELETE RESTRICT,
  pool_status             text NOT NULL DEFAULT 'active'
                            CHECK (pool_status IN ('active', 'suspended', 'removed')),
  added_at                timestamptz NOT NULL DEFAULT now(),
  added_by                uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  removed_at              timestamptz,
  removed_by              uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes                   text,
  UNIQUE (user_id)
);

-- ── 3. Allocations ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_allocations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_member_id      uuid NOT NULL REFERENCES public.admin_pool_members(id) ON DELETE CASCADE,
  allocated_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  allocator_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope_type          text NOT NULL CHECK (scope_type IN ('team', 'task', 'programme', 'department')),
  scope_label         text NOT NULL,
  start_date          date NOT NULL,
  end_date            date NOT NULL,
  status              text NOT NULL DEFAULT 'active'
                        CHECK (status IN ('pending_approval', 'active', 'completed', 'revoked')),
  approval_task_id    uuid REFERENCES public.approval_tasks(id) ON DELETE SET NULL,
  revoked_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at          timestamptz,
  revocation_reason   text,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date > start_date)
);

-- ── 4. Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_admin_pool_members_user        ON public.admin_pool_members(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_pool_members_role        ON public.admin_pool_members(role_key);
CREATE INDEX IF NOT EXISTS idx_admin_pool_members_status      ON public.admin_pool_members(pool_status);
CREATE INDEX IF NOT EXISTS idx_admin_allocations_member       ON public.admin_allocations(pool_member_id);
CREATE INDEX IF NOT EXISTS idx_admin_allocations_allocator    ON public.admin_allocations(allocator_id);
CREATE INDEX IF NOT EXISTS idx_admin_allocations_allocated    ON public.admin_allocations(allocated_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_allocations_status       ON public.admin_allocations(status);

-- ── 5. Updated_at trigger ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_admin_pool_config_updated   ON public.admin_pool_config;
DROP TRIGGER IF EXISTS trg_admin_allocations_updated   ON public.admin_allocations;

CREATE TRIGGER trg_admin_pool_config_updated
  BEFORE UPDATE ON public.admin_pool_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_admin_allocations_updated
  BEFORE UPDATE ON public.admin_allocations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 6. Auto-add to pool when staff registration is approved ─────────────────
CREATE OR REPLACE FUNCTION public.auto_add_to_admin_pool()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Only fire when transitioning TO approved
  IF NEW.status <> 'approved' OR OLD.status = 'approved' THEN
    RETURN NEW;
  END IF;

  -- Check if this role is pool-eligible
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_pool_config
    WHERE role_key = NEW.role_requested
      AND is_pool_eligible = true
      AND is_active = true
  ) THEN
    RETURN NEW;
  END IF;

  -- Resolve the auth user by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = NEW.email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN NEW;  -- No auth account yet – skip silently
  END IF;

  -- Upsert: if already in pool (re-approval scenario) just reactivate
  INSERT INTO public.admin_pool_members (
    staff_registration_id, user_id, role_key, pool_status, added_by
  )
  VALUES (
    NEW.id, v_user_id, NEW.role_requested, 'active', NEW.approved_by
  )
  ON CONFLICT (user_id) DO UPDATE
    SET pool_status = 'active',
        role_key    = EXCLUDED.role_key,
        added_by    = EXCLUDED.added_by,
        removed_at  = NULL,
        removed_by  = NULL;

  -- Audit
  INSERT INTO public.onboarding_audit_log (
    entity_type, entity_id, action, performed_by, details
  ) VALUES (
    'admin_allocation',
    NEW.id::text,
    'added_to_pool',
    NEW.approved_by,
    jsonb_build_object(
      'user_id',    v_user_id,
      'role_key',   NEW.role_requested,
      'full_name',  NEW.full_name,
      'email',      NEW.email
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_add_admin_pool ON public.staff_registrations;

CREATE TRIGGER trg_auto_add_admin_pool
  AFTER UPDATE OF status ON public.staff_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_to_admin_pool();

-- ── 7. Helper: get caller's privilege level ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_privilege_level()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT MAX(c.privilege_level)
     FROM public.user_roles ur
     JOIN public.admin_pool_config c ON c.role_key = ur.role
     WHERE ur.user_id = auth.uid()
       AND c.can_allocate = true
       AND c.is_active = true),
    0
  );
$$;

-- ── 8. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.admin_pool_config    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_pool_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_allocations    ENABLE ROW LEVEL SECURITY;

-- admin_pool_config: any authenticated user can read; only super_admin can write
CREATE POLICY "pool_config_read"  ON public.admin_pool_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "pool_config_write" ON public.admin_pool_config
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- admin_pool_members: readable by anyone who can_allocate; writable by allocators or service_role
CREATE POLICY "pool_members_read" ON public.admin_pool_members
  FOR SELECT TO authenticated
  USING (
    public.get_my_privilege_level() > 0
    OR user_id = auth.uid()
  );

CREATE POLICY "pool_members_write" ON public.admin_pool_members
  FOR ALL TO authenticated
  USING (public.get_my_privilege_level() > 0)
  WITH CHECK (public.get_my_privilege_level() > 0);

-- admin_allocations: readable by allocator or allocated user or higher-privilege role
CREATE POLICY "allocations_read" ON public.admin_allocations
  FOR SELECT TO authenticated
  USING (
    allocator_id = auth.uid()
    OR allocated_user_id = auth.uid()
    OR public.get_my_privilege_level() >= 3
  );

CREATE POLICY "allocations_insert" ON public.admin_allocations
  FOR INSERT TO authenticated
  WITH CHECK (
    allocator_id = auth.uid()
    AND public.get_my_privilege_level() > 0
  );

CREATE POLICY "allocations_update" ON public.admin_allocations
  FOR UPDATE TO authenticated
  USING (
    allocator_id = auth.uid()
    OR public.get_my_privilege_level() >= 4
  );

-- Service role bypass
CREATE POLICY "pool_config_service"   ON public.admin_pool_config    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "pool_members_service"  ON public.admin_pool_members   FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "allocations_service"   ON public.admin_allocations    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── 9. Grants ────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_pool_config    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_pool_members   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_allocations    TO authenticated;
GRANT ALL ON public.admin_pool_config    TO service_role;
GRANT ALL ON public.admin_pool_members   TO service_role;
GRANT ALL ON public.admin_allocations    TO service_role;

-- ── 10. Seed default config ───────────────────────────────────────────────────
INSERT INTO public.admin_pool_config
  (role_key, display_name, privilege_level, can_allocate, is_pool_eligible, requires_approval, approval_assigned_role)
VALUES
  ('super_admin',       'Super Admin',         5, true,  false, false, null),
  ('systems_admin',     'Systems Admin',       4, true,  true,  false, null),
  ('operations',        'Operations Control',  3, true,  true,  false, null),
  ('programme_manager', 'Programme Manager',   2, true,  true,  true,  'operations'),
  ('talent_manager',    'Talent Manager',      2, true,  true,  true,  'operations'),
  ('facilitator',       'Facilitator',         0, false, false, false, null),
  ('assessor',          'Assessor',            0, false, false, false, null),
  ('moderator',         'Moderator',           0, false, false, false, null),
  ('mentor',            'Mentor',              0, false, false, false, null),
  ('learner',           'Learner',             0, false, false, false, null),
  ('sponsor',           'Sponsor',             0, false, false, false, null)
ON CONFLICT (role_key) DO NOTHING;
