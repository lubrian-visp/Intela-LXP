
REVOKE ALL ON FUNCTION public.get_tenant_active_subscription(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_tenant_active_subscription(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_recommended_provider(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_recommended_provider(text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.record_usage_event(uuid, text, numeric, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_usage_event(uuid, text, numeric, jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.get_tenant_usage_summary(uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_tenant_usage_summary(uuid, timestamptz) TO authenticated;
