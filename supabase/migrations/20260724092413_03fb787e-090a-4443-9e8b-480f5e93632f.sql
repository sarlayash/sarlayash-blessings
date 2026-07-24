
-- ============ ROLES ============
create type public.app_role as enum ('applicant','admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique(user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "users read own roles" on public.user_roles for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "admins manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- ============ updated_at helper ============
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  phone text,
  headline text,
  bio text,
  location text,
  linkedin_url text,
  github_url text,
  portfolio_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "users read own profile" on public.profiles for select to authenticated
  using (auth.uid() = id or public.has_role(auth.uid(),'admin'));
create policy "users update own profile" on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);
create policy "users insert own profile" on public.profiles for insert to authenticated
  with check (auth.uid() = id);
create policy "admins manage profiles" on public.profiles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============ Auto-provision profile + default role on signup ============
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'applicant')
  on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ APPLICATIONS ============
create type public.application_status as enum ('draft','submitted','under_review','accepted','rejected','withdrawn');

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program text not null,
  track text,
  status public.application_status not null default 'draft',
  motivation text,
  experience text,
  submitted_at timestamptz,
  decided_at timestamptz,
  reviewer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
grant select, insert, update, delete on public.applications to authenticated;
grant all on public.applications to service_role;
alter table public.applications enable row level security;
create index applications_user_idx on public.applications(user_id);
create index applications_status_idx on public.applications(status);
create policy "users read own applications" on public.applications for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "users manage own applications" on public.applications for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "admins manage applications" on public.applications for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger trg_applications_updated before update on public.applications
  for each row execute function public.set_updated_at();

-- ============ ASSESSMENTS ============
create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  track text,
  duration_minutes int not null default 30,
  passing_score int not null default 70,
  questions jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
grant select on public.assessments to authenticated;
grant all on public.assessments to service_role;
alter table public.assessments enable row level security;
create policy "authenticated read active assessments" on public.assessments for select to authenticated
  using (is_active = true or public.has_role(auth.uid(),'admin'));
create policy "admins manage assessments" on public.assessments for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger trg_assessments_updated before update on public.assessments
  for each row execute function public.set_updated_at();

-- ============ ASSESSMENT ANSWERS ============
create table public.assessment_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  score int,
  passed boolean,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
grant select, insert, update, delete on public.assessment_answers to authenticated;
grant all on public.assessment_answers to service_role;
alter table public.assessment_answers enable row level security;
create index aa_user_idx on public.assessment_answers(user_id);
create index aa_assessment_idx on public.assessment_answers(assessment_id);
create policy "users read own answers" on public.assessment_answers for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "users manage own answers" on public.assessment_answers for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "admins manage answers" on public.assessment_answers for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger trg_aa_updated before update on public.assessment_answers
  for each row execute function public.set_updated_at();

-- ============ PROJECTS ============
create type public.project_status as enum ('not_started','in_progress','submitted','reviewed','completed');

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  track text,
  status public.project_status not null default 'not_started',
  repo_url text,
  demo_url text,
  submission_url text,
  feedback text,
  score int,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
grant select, insert, update, delete on public.projects to authenticated;
grant all on public.projects to service_role;
alter table public.projects enable row level security;
create index projects_user_idx on public.projects(user_id);
create policy "users read own projects" on public.projects for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "users manage own projects" on public.projects for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "admins manage projects" on public.projects for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger trg_projects_updated before update on public.projects
  for each row execute function public.set_updated_at();

-- ============ CERTIFICATES ============
create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  certificate_number text not null unique,
  title text not null,
  track text,
  issued_at timestamptz not null default now(),
  pdf_url text,
  verification_code text not null unique default replace(gen_random_uuid()::text,'-',''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
grant select on public.certificates to authenticated;
grant select on public.certificates to anon;
grant all on public.certificates to service_role;
alter table public.certificates enable row level security;
create index certificates_user_idx on public.certificates(user_id);
create policy "users read own certificates" on public.certificates for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "public verify by code" on public.certificates for select to anon
  using (true);
create policy "admins manage certificates" on public.certificates for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger trg_certificates_updated before update on public.certificates
  for each row execute function public.set_updated_at();

-- ============ NOTIFICATIONS ============
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  category text not null default 'info',
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
grant select, insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create index notifications_user_idx on public.notifications(user_id);
create policy "users read own notifications" on public.notifications for select to authenticated
  using (auth.uid() = user_id);
create policy "users update own notifications" on public.notifications for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "admins manage notifications" on public.notifications for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger trg_notifications_updated before update on public.notifications
  for each row execute function public.set_updated_at();

-- ============ AUDIT LOGS ============
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);
grant select, insert on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create index audit_actor_idx on public.audit_logs(actor_id);
create policy "admins read audit logs" on public.audit_logs for select to authenticated
  using (public.has_role(auth.uid(),'admin'));
create policy "authenticated insert audit logs" on public.audit_logs for insert to authenticated
  with check (auth.uid() = actor_id);

-- ============ VISITOR ANALYTICS ============
create table public.visitor_analytics (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  referrer text,
  user_agent text,
  ip_address text,
  country text,
  session_id text,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
grant insert on public.visitor_analytics to anon;
grant insert on public.visitor_analytics to authenticated;
grant select on public.visitor_analytics to authenticated;
grant all on public.visitor_analytics to service_role;
alter table public.visitor_analytics enable row level security;
create index va_path_idx on public.visitor_analytics(path);
create index va_created_idx on public.visitor_analytics(created_at);
create policy "anyone insert analytics" on public.visitor_analytics for insert to anon
  with check (true);
create policy "auth insert analytics" on public.visitor_analytics for insert to authenticated
  with check (true);
create policy "admins read analytics" on public.visitor_analytics for select to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- ============ EMAIL QUEUE ============
create type public.email_status as enum ('queued','sending','sent','failed');

create table public.email_queue (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  template text not null,
  subject text not null,
  payload jsonb not null default '{}'::jsonb,
  status public.email_status not null default 'queued',
  attempts int not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
grant select on public.email_queue to authenticated;
grant all on public.email_queue to service_role;
alter table public.email_queue enable row level security;
create index eq_status_idx on public.email_queue(status);
create policy "admins read email queue" on public.email_queue for select to authenticated
  using (public.has_role(auth.uid(),'admin'));
create policy "admins manage email queue" on public.email_queue for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger trg_email_queue_updated before update on public.email_queue
  for each row execute function public.set_updated_at();

-- ============ SYSTEM SETTINGS ============
create table public.system_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  description text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.system_settings to authenticated;
grant all on public.system_settings to service_role;
alter table public.system_settings enable row level security;
create policy "auth read settings" on public.system_settings for select to authenticated
  using (true);
create policy "admins manage settings" on public.system_settings for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger trg_settings_updated before update on public.system_settings
  for each row execute function public.set_updated_at();

-- ============ ACTIVITY LOGS ============
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  activity text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select, insert on public.activity_logs to authenticated;
grant all on public.activity_logs to service_role;
alter table public.activity_logs enable row level security;
create index al_user_idx on public.activity_logs(user_id);
create policy "users read own activity" on public.activity_logs for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "users insert own activity" on public.activity_logs for insert to authenticated
  with check (auth.uid() = user_id);

-- seed a couple of settings
insert into public.system_settings (key, value, description) values
  ('org', jsonb_build_object('name','SarlaYash Learning Solutions LLP','tagline','Legacy of Values. Future of Learning.'), 'Organization info'),
  ('registration_open', 'true'::jsonb, 'Whether new applications are accepted')
on conflict (key) do nothing;
