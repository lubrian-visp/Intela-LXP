
-- Add version column to programmes
ALTER TABLE public.programmes ADD COLUMN IF NOT EXISTS version text NOT NULL DEFAULT 'v1.0';

-- Create content_blocks table for lesson-level content within modules
CREATE TABLE public.content_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id uuid NOT NULL REFERENCES public.programme_modules(id) ON DELETE CASCADE,
  block_type text NOT NULL DEFAULT 'text', -- text, video, scorm, file, interactive
  title text NOT NULL,
  content jsonb DEFAULT '{}'::jsonb, -- flexible content storage (html body, embed config, etc.)
  file_url text, -- for video/scorm/file uploads
  sequence_order integer NOT NULL DEFAULT 1,
  duration_minutes integer,
  is_required boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_blocks ENABLE ROW LEVEL SECURITY;

-- Policies: same pattern as programme_modules
CREATE POLICY "Admins manage content blocks"
  ON public.content_blocks FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'programme_manager'::app_role));

CREATE POLICY "Authenticated read content blocks"
  ON public.content_blocks FOR SELECT
  USING (true);

-- Index for fast lookups
CREATE INDEX idx_content_blocks_module ON public.content_blocks(module_id, sequence_order);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_blocks;
