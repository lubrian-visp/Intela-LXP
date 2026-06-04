
-- Sponsor invoices/funding tracker
CREATE TABLE public.sponsor_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sponsor_id UUID NOT NULL,
  programme_id UUID REFERENCES public.programmes(id) ON DELETE SET NULL,
  cohort_id UUID REFERENCES public.cohorts(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  status TEXT NOT NULL DEFAULT 'draft',
  issued_date DATE,
  due_date DATE,
  paid_date DATE,
  payment_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sponsor messages (simple direct messaging)
CREATE TABLE public.sponsor_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  parent_message_id UUID REFERENCES public.sponsor_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sponsor_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_messages ENABLE ROW LEVEL SECURITY;

-- RLS: sponsor_invoices - sponsors see their own, admins see all
CREATE POLICY "Sponsors view own invoices" ON public.sponsor_invoices
  FOR SELECT TO authenticated
  USING (sponsor_id = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Admins manage invoices" ON public.sponsor_invoices
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'operations'::app_role));

-- RLS: sponsor_messages - users see messages they sent or received
CREATE POLICY "Users view own messages" ON public.sponsor_messages
  FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users send messages" ON public.sponsor_messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Recipients mark as read" ON public.sponsor_messages
  FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid());

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.sponsor_messages;
