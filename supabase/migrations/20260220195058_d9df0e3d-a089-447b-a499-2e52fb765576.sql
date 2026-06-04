
-- Create pathways table
CREATE TABLE public.pathways (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  phase TEXT NOT NULL DEFAULT 'knowledge', -- knowledge, practical, workplace
  version TEXT NOT NULL DEFAULT 'v1.0',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Link modules to pathways
ALTER TABLE public.programme_modules
  ADD COLUMN pathway_id UUID REFERENCES public.pathways(id) ON DELETE SET NULL,
  ADD COLUMN prerequisite_module_id UUID REFERENCES public.programme_modules(id) ON DELETE SET NULL,
  ADD COLUMN credential_label TEXT;

-- Enable RLS
ALTER TABLE public.pathways ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated read pathways"
  ON public.pathways FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage pathways"
  ON public.pathways FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'programme_manager'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'programme_manager'));

-- Anon read for public access
CREATE POLICY "Anon read pathways"
  ON public.pathways FOR SELECT
  TO anon
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_pathways_updated_at
  BEFORE UPDATE ON public.pathways
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
