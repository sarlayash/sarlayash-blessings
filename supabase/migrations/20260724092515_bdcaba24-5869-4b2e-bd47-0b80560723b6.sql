
-- avatars bucket: user-scoped by first path segment
create policy "avatars users read own" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (auth.uid()::text = (storage.foldername(name))[1] or public.has_role(auth.uid(),'admin')));
create policy "avatars users write own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatars users update own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatars users delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatars admins manage" on storage.objects for all to authenticated
  using (bucket_id = 'avatars' and public.has_role(auth.uid(),'admin'))
  with check (bucket_id = 'avatars' and public.has_role(auth.uid(),'admin'));

-- certificates bucket
create policy "certificates users read own" on storage.objects for select to authenticated
  using (bucket_id = 'certificates' and (auth.uid()::text = (storage.foldername(name))[1] or public.has_role(auth.uid(),'admin')));
create policy "certificates admins manage" on storage.objects for all to authenticated
  using (bucket_id = 'certificates' and public.has_role(auth.uid(),'admin'))
  with check (bucket_id = 'certificates' and public.has_role(auth.uid(),'admin'));

-- project-submissions bucket
create policy "submissions users read own" on storage.objects for select to authenticated
  using (bucket_id = 'project-submissions' and (auth.uid()::text = (storage.foldername(name))[1] or public.has_role(auth.uid(),'admin')));
create policy "submissions users write own" on storage.objects for insert to authenticated
  with check (bucket_id = 'project-submissions' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "submissions users update own" on storage.objects for update to authenticated
  using (bucket_id = 'project-submissions' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "submissions users delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'project-submissions' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "submissions admins manage" on storage.objects for all to authenticated
  using (bucket_id = 'project-submissions' and public.has_role(auth.uid(),'admin'))
  with check (bucket_id = 'project-submissions' and public.has_role(auth.uid(),'admin'));
