
-- Add country-awareness columns to sponsor_invoices
ALTER TABLE public.sponsor_invoices
  ADD COLUMN country_id UUID REFERENCES public.countries(id) ON DELETE SET NULL,
  ADD COLUMN framework_id UUID REFERENCES public.country_regulatory_frameworks(id) ON DELETE SET NULL,
  ADD COLUMN programme_type_id UUID REFERENCES public.programme_types(id) ON DELETE SET NULL,
  ADD COLUMN funding_type TEXT,
  ADD COLUMN claim_reference TEXT;
