
-- Create moderation_items table
CREATE TABLE public.moderation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type text NOT NULL DEFAULT 'forum_post',
  submitted_by uuid NOT NULL,
  programme_id uuid REFERENCES public.programmes(id),
  content text NOT NULL,
  reason text NOT NULL,
  flagged_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  priority text NOT NULL DEFAULT 'medium',
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.moderation_items ENABLE ROW LEVEL SECURITY;

-- Moderators and admins can manage all items
CREATE POLICY "Moderators manage moderation items"
ON public.moderation_items FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Users can see their own flagged content
CREATE POLICY "Users see own flagged items"
ON public.moderation_items FOR SELECT TO authenticated
USING (submitted_by = auth.uid());

-- Any authenticated user can flag content (insert)
CREATE POLICY "Authenticated users can flag content"
ON public.moderation_items FOR INSERT TO authenticated
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_moderation_items_updated_at
BEFORE UPDATE ON public.moderation_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
