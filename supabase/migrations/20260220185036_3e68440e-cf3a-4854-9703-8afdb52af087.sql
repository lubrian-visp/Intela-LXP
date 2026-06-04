
-- Programme Types table (persisted version of the frontend hardcoded types)
CREATE TABLE public.programme_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT 'hsl(222, 60%, 18%)',
  programme_count INTEGER NOT NULL DEFAULT 0,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.programme_types ENABLE ROW LEVEL SECURITY;

-- Public read (reference/config data needed before auth is implemented)
CREATE POLICY "Anyone can read programme types" ON public.programme_types FOR SELECT USING (true);
-- Write policies will be tightened once auth/RBAC is in place
CREATE POLICY "Authenticated users can manage programme types" ON public.programme_types FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- Allow anon insert/update/delete temporarily until auth is built
CREATE POLICY "Anon can manage programme types temporarily" ON public.programme_types FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE TRIGGER update_programme_types_updated_at BEFORE UPDATE ON public.programme_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_programme_types_active ON public.programme_types(is_active);
