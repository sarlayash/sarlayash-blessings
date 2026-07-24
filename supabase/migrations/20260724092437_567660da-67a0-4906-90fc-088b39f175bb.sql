
-- Tighten permissive inserts
drop policy if exists "anyone insert analytics" on public.visitor_analytics;
drop policy if exists "auth insert analytics" on public.visitor_analytics;
create policy "anon insert analytics" on public.visitor_analytics for insert to anon
  with check (path is not null and length(path) between 1 and 512);
create policy "auth insert analytics" on public.visitor_analytics for insert to authenticated
  with check (path is not null and length(path) between 1 and 512 and (user_id is null or user_id = auth.uid()));

-- Lock down SECURITY DEFINER functions
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;

-- set_updated_at is invoked by triggers with the table owner's rights; not exposed to API but tighten anyway
revoke execute on function public.set_updated_at() from public, anon, authenticated;
grant execute on function public.set_updated_at() to service_role;
