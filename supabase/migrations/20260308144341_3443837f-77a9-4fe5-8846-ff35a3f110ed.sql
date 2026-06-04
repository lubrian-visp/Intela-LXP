
-- Trigger function: auto-generate invoice when a quote is accepted
CREATE OR REPLACE FUNCTION public.auto_generate_invoice_on_quote_accept()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _invoice_number text;
  _due_date date;
BEGIN
  -- Only fire when status changes TO 'accepted'
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
  IF NEW.status <> 'accepted' THEN RETURN NEW; END IF;

  -- Check if invoice already exists for this quote
  IF EXISTS (SELECT 1 FROM sponsor_invoices WHERE quote_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Generate invoice number
  _invoice_number := 'INV-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || SUBSTRING(NEW.id::text FROM 1 FOR 8);
  
  -- Default due date: 30 days from now
  _due_date := (now() + interval '30 days')::date;

  INSERT INTO sponsor_invoices (
    sponsor_id, invoice_number, description, amount, currency,
    programme_id, programme_type_id, country_id, quote_id,
    learner_count, cost_per_learner,
    status, issued_date, due_date
  ) VALUES (
    NEW.sponsor_id,
    _invoice_number,
    'Quote ' || NEW.quote_number || ' — ' || NEW.learner_count || ' learner(s) × ' || NEW.currency || ' ' || NEW.cost_per_learner,
    COALESCE(NEW.total_amount, NEW.learner_count * NEW.cost_per_learner),
    NEW.currency,
    NEW.programme_id,
    NEW.programme_type_id,
    NEW.country_id,
    NEW.id,
    NEW.learner_count,
    NEW.cost_per_learner,
    'issued',
    now()::date,
    _due_date
  );

  -- Mark the quote as invoiced
  NEW.status := 'invoiced';

  -- Notify the sponsor
  INSERT INTO notifications (user_id, title, body, category, reference_table, action_url)
  VALUES (
    NEW.sponsor_id,
    'Invoice Generated: ' || _invoice_number,
    'An invoice for ' || NEW.currency || ' ' || COALESCE(NEW.total_amount, NEW.learner_count * NEW.cost_per_learner) || ' has been automatically generated from your accepted quote.',
    'general',
    'sponsor_invoices',
    '/sponsor/invoices'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_invoice_on_quote_accept
  BEFORE UPDATE ON sponsor_quotes
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_invoice_on_quote_accept();

-- Trigger function: auto-detect overdue invoices on any update
CREATE OR REPLACE FUNCTION public.check_invoice_overdue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If invoice is issued and past due date, mark as overdue
  IF NEW.status = 'issued' AND NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE THEN
    NEW.status := 'overdue';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_invoice_overdue
  BEFORE UPDATE ON sponsor_invoices
  FOR EACH ROW
  EXECUTE FUNCTION check_invoice_overdue();
