
-- 1. Add cost_per_learner to programmes
ALTER TABLE public.programmes ADD COLUMN IF NOT EXISTS cost_per_learner numeric DEFAULT NULL;

-- 2. Create sponsor_quotes table
CREATE TABLE public.sponsor_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number text NOT NULL,
  sponsor_id uuid NOT NULL,
  programme_id uuid REFERENCES public.programmes(id) ON DELETE SET NULL,
  programme_type_id uuid REFERENCES public.programme_types(id) ON DELETE SET NULL,
  country_id uuid REFERENCES public.countries(id) ON DELETE SET NULL,
  cohort_id uuid REFERENCES public.cohorts(id) ON DELETE SET NULL,
  cost_per_learner numeric NOT NULL DEFAULT 0,
  learner_count integer NOT NULL DEFAULT 1,
  total_amount numeric GENERATED ALWAYS AS (cost_per_learner * learner_count) STORED,
  currency text NOT NULL DEFAULT 'ZAR',
  status text NOT NULL DEFAULT 'draft',
  valid_until date,
  notes text,
  created_by uuid,
  accepted_at timestamptz,
  accepted_by uuid,
  rejected_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sponsor_quotes ENABLE ROW LEVEL SECURITY;

-- RLS: Sponsors see their own quotes; staff with permissions can see all
CREATE POLICY "Users can view own quotes" ON public.sponsor_quotes
  FOR SELECT TO authenticated
  USING (sponsor_id = auth.uid() OR public.is_platform_admin(auth.uid()) OR public.has_permission(auth.uid(), 'programme', 'approve'));

CREATE POLICY "Staff can insert quotes" ON public.sponsor_quotes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin(auth.uid()) OR public.has_permission(auth.uid(), 'programme', 'create') OR created_by = auth.uid());

CREATE POLICY "Staff can update quotes" ON public.sponsor_quotes
  FOR UPDATE TO authenticated
  USING (sponsor_id = auth.uid() OR public.is_platform_admin(auth.uid()) OR public.has_permission(auth.uid(), 'programme', 'approve'));

-- 3. Add quote_id to sponsor_invoices
ALTER TABLE public.sponsor_invoices ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.sponsor_quotes(id) ON DELETE SET NULL;
ALTER TABLE public.sponsor_invoices ADD COLUMN IF NOT EXISTS learner_count integer;
ALTER TABLE public.sponsor_invoices ADD COLUMN IF NOT EXISTS cost_per_learner numeric;

-- 4. Trigger for updated_at
CREATE TRIGGER trg_sponsor_quotes_updated_at
  BEFORE UPDATE ON public.sponsor_quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
