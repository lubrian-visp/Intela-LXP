
-- Enable realtime for moderation_items and learner_registrations
ALTER PUBLICATION supabase_realtime ADD TABLE public.moderation_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.learner_registrations;
