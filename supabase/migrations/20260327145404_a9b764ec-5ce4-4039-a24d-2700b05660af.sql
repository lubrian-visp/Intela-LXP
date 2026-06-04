
-- Transactional Outbox table for reliable cross-service events
CREATE TABLE public.transactional_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  retry_count integer NOT NULL DEFAULT 0,
  last_error text
);

CREATE INDEX idx_outbox_status ON public.transactional_outbox (status) WHERE status = 'pending';
CREATE INDEX idx_outbox_created ON public.transactional_outbox (created_at);

-- Idempotency keys table to prevent duplicate mutation processing
CREATE TABLE public.idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL UNIQUE,
  operation text NOT NULL,
  request_hash text,
  response_status integer,
  response_body jsonb,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX idx_idempotency_key ON public.idempotency_keys (idempotency_key);
CREATE INDEX idx_idempotency_expires ON public.idempotency_keys (expires_at);

-- Assessor reliability metrics table for inter-rater reliability storage
CREATE TABLE public.assessor_reliability_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessor_id uuid NOT NULL,
  programme_id uuid REFERENCES public.programmes(id) ON DELETE CASCADE,
  total_graded integer NOT NULL DEFAULT 0,
  average_score numeric(5,2),
  standard_deviation numeric(5,2),
  agreement_rate numeric(5,2),
  deviation_from_mean numeric(5,2),
  cohens_kappa numeric(5,3),
  consistency_rating text NOT NULL DEFAULT 'Medium',
  calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessor_id, programme_id)
);

CREATE INDEX idx_reliability_assessor ON public.assessor_reliability_metrics (assessor_id);
CREATE INDEX idx_reliability_programme ON public.assessor_reliability_metrics (programme_id);

-- Data quality audit results table
CREATE TABLE public.data_quality_audit_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_type text NOT NULL,
  table_name text NOT NULL,
  issue_description text NOT NULL,
  affected_record_ids text[],
  severity text NOT NULL DEFAULT 'warning',
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dqa_unresolved ON public.data_quality_audit_results (resolved) WHERE resolved = false;

-- Enable RLS on all new tables
ALTER TABLE public.transactional_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessor_reliability_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_quality_audit_results ENABLE ROW LEVEL SECURITY;

-- RLS policies: platform admins only for outbox/idempotency/audit
CREATE POLICY "Platform admins can manage outbox" ON public.transactional_outbox
  FOR ALL TO authenticated USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can manage idempotency" ON public.idempotency_keys
  FOR ALL TO authenticated USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can view audit results" ON public.data_quality_audit_results
  FOR ALL TO authenticated USING (public.is_platform_admin(auth.uid()));

-- Assessor reliability: assessors see own, admins see all
CREATE POLICY "Assessors can view own metrics" ON public.assessor_reliability_metrics
  FOR SELECT TO authenticated USING (
    assessor_id = auth.uid() OR public.is_platform_admin(auth.uid())
    OR public.has_role(auth.uid(), 'moderator'::app_role)
    OR public.has_role(auth.uid(), 'operations'::app_role)
  );

CREATE POLICY "Platform admins can manage metrics" ON public.assessor_reliability_metrics
  FOR ALL TO authenticated USING (public.is_platform_admin(auth.uid()));

-- Trigger to write outbox events on credential issuance
CREATE OR REPLACE FUNCTION public.outbox_on_credential_issued()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  INSERT INTO public.transactional_outbox (event_type, aggregate_type, aggregate_id, payload)
  VALUES (
    'credential.issued',
    'issued_credentials',
    NEW.id::text,
    jsonb_build_object(
      'learner_id', NEW.learner_id,
      'programme_id', NEW.programme_id,
      'title', NEW.title,
      'issued_at', NEW.issued_at
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_outbox_credential_issued
  AFTER INSERT ON public.issued_credentials
  FOR EACH ROW EXECUTE FUNCTION public.outbox_on_credential_issued();

-- Trigger to write outbox events on approval decisions
CREATE OR REPLACE FUNCTION public.outbox_on_approval_decision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('approved', 'rejected') THEN
    INSERT INTO public.transactional_outbox (event_type, aggregate_type, aggregate_id, payload)
    VALUES (
      'approval.' || NEW.status,
      NEW.reference_table,
      NEW.reference_id,
      jsonb_build_object(
        'task_id', NEW.id,
        'task_type', NEW.task_type,
        'decided_by', NEW.decided_by,
        'notes', NEW.notes
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_outbox_approval_decision
  AFTER UPDATE ON public.approval_tasks
  FOR EACH ROW EXECUTE FUNCTION public.outbox_on_approval_decision();

-- Function to clean expired idempotency keys
CREATE OR REPLACE FUNCTION public.cleanup_expired_idempotency_keys()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = 'public' AS $$
  DELETE FROM public.idempotency_keys WHERE expires_at < now();
$$;

-- Enable realtime for outbox (so edge functions can process events)
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactional_outbox;
