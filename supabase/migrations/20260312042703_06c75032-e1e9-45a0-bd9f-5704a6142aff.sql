-- Add archived_at and archived_by to programmes
ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS archived_by uuid DEFAULT NULL;

-- Add archived_at and archived_by to cohorts
ALTER TABLE public.cohorts
  ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS archived_by uuid DEFAULT NULL;

-- Add archived_at and archived_by to programme_types
ALTER TABLE public.programme_types
  ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS archived_by uuid DEFAULT NULL;

-- Create deletion_audit_log table for tracking all deletion/archive/reassignment events
CREATE TABLE IF NOT EXISTS public.deletion_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  entity_name text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on deletion_audit_log
ALTER TABLE public.deletion_audit_log ENABLE ROW LEVEL SECURITY;

-- Only super_admin, operations, and systems_admin can read audit logs
CREATE POLICY "Admin read deletion audit logs"
  ON public.deletion_audit_log
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'operations'::app_role)
    OR public.has_role(auth.uid(), 'systems_admin'::app_role)
  );

-- Any authenticated user can insert (application code handles permission checks)
CREATE POLICY "Authenticated insert deletion audit logs"
  ON public.deletion_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_deletion_audit_log_entity ON public.deletion_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_deletion_audit_log_user ON public.deletion_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_audit_log_created ON public.deletion_audit_log(created_at DESC);