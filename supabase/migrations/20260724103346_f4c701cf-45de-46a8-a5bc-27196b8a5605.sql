
REVOKE ALL ON FUNCTION public.log_pipeline_change() FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;
