
-- Pipeline stage enum
DO $$ BEGIN
  CREATE TYPE public.pipeline_stage AS ENUM (
    'applied','under_review','shortlisted',
    'assessment_assigned','assessment_completed',
    'project_assigned','project_submitted',
    'interview_scheduled','selected',
    'offer_released','internship_started','internship_completed','certificate_issued','rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS pipeline_stage public.pipeline_stage NOT NULL DEFAULT 'applied',
  ADD COLUMN IF NOT EXISTS assigned_reviewer uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Staff helper
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','super_admin','mentor','reviewer','hr','placement','auditor')
  );
$$;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- pipeline_history
CREATE TABLE IF NOT EXISTS public.pipeline_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  from_stage public.pipeline_stage,
  to_stage public.pipeline_stage NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.pipeline_history TO authenticated;
GRANT ALL ON public.pipeline_history TO service_role;
ALTER TABLE public.pipeline_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read pipeline history" ON public.pipeline_history FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "admins insert pipeline history" ON public.pipeline_history FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- tracks
CREATE TABLE IF NOT EXISTS public.tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  tagline text,
  description text,
  duration_weeks integer NOT NULL DEFAULT 8,
  capacity integer NOT NULL DEFAULT 50,
  prerequisites text[] NOT NULL DEFAULT '{}',
  skills text[] NOT NULL DEFAULT '{}',
  outcomes text[] NOT NULL DEFAULT '{}',
  mentor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','draft')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tracks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tracks TO authenticated;
GRANT ALL ON public.tracks TO service_role;
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active tracks" ON public.tracks FOR SELECT USING (status='active' OR public.is_staff(auth.uid()));
CREATE POLICY "admins manage tracks" ON public.tracks FOR ALL USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_tracks_updated BEFORE UPDATE ON public.tracks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- cohorts
CREATE TABLE IF NOT EXISTS public.cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  track_id uuid REFERENCES public.tracks(id) ON DELETE SET NULL,
  starts_on date,
  ends_on date,
  capacity integer NOT NULL DEFAULT 30,
  mentor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','active','completed','archived')),
  timeline jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cohorts TO authenticated;
GRANT ALL ON public.cohorts TO service_role;
ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read cohorts" ON public.cohorts FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "admins manage cohorts" ON public.cohorts FOR ALL USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_cohorts_updated BEFORE UPDATE ON public.cohorts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- cohort_members
CREATE TABLE IF NOT EXISTS public.cohort_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'applicant',
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cohort_id, user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cohort_members TO authenticated;
GRANT ALL ON public.cohort_members TO service_role;
ALTER TABLE public.cohort_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read cohort members" ON public.cohort_members FOR SELECT USING (public.is_staff(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "admins manage cohort members" ON public.cohort_members FOR ALL USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- interviews
CREATE TABLE IF NOT EXISTS public.interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES public.applications(id) ON DELETE SET NULL,
  applicant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  panel uuid[] NOT NULL DEFAULT '{}',
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 45,
  mode text NOT NULL DEFAULT 'video' CHECK (mode IN ('video','onsite','phone')),
  meeting_url text,
  location text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled','no_show')),
  rating integer CHECK (rating BETWEEN 1 AND 10),
  recommendation text CHECK (recommendation IN ('select','reject','hold')),
  feedback text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interviews TO authenticated;
GRANT ALL ON public.interviews TO service_role;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read interviews" ON public.interviews FOR SELECT USING (public.is_staff(auth.uid()) OR applicant_id = auth.uid());
CREATE POLICY "admins manage interviews" ON public.interviews FOR ALL USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_interviews_updated BEFORE UPDATE ON public.interviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- offers
CREATE TABLE IF NOT EXISTS public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES public.applications(id) ON DELETE SET NULL,
  applicant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_number text NOT NULL UNIQUE,
  role_title text NOT NULL,
  track text,
  stipend text,
  start_date date,
  end_date date,
  location text,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','rejected','expired','revoked')),
  issued_at timestamptz,
  responded_at timestamptz,
  deadline timestamptz,
  pdf_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff and owner read offers" ON public.offers FOR SELECT USING (public.is_staff(auth.uid()) OR applicant_id = auth.uid());
CREATE POLICY "owner respond to offer" ON public.offers FOR UPDATE USING (applicant_id = auth.uid() AND status = 'sent') WITH CHECK (applicant_id = auth.uid() AND status IN ('accepted','rejected'));
CREATE POLICY "admins manage offers" ON public.offers FOR ALL USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_offers_updated BEFORE UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- announcements
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  audience text NOT NULL DEFAULT 'all' CHECK (audience IN ('all','track','cohort','selected')),
  track text,
  cohort_id uuid REFERENCES public.cohorts(id) ON DELETE SET NULL,
  recipient_ids uuid[] NOT NULL DEFAULT '{}',
  send_email boolean NOT NULL DEFAULT false,
  send_notification boolean NOT NULL DEFAULT true,
  scheduled_for timestamptz,
  sent_at timestamptz,
  sent_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sent','failed')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read announcements" ON public.announcements FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "admins manage announcements" ON public.announcements FOR ALL USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_announcements_updated BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- admin_notes
CREATE TABLE IF NOT EXISTS public.admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_notes TO authenticated;
GRANT ALL ON public.admin_notes TO service_role;
ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read admin notes" ON public.admin_notes FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "staff insert admin notes" ON public.admin_notes FOR INSERT WITH CHECK (public.is_staff(auth.uid()) AND author_id = auth.uid());
CREATE POLICY "author update own notes" ON public.admin_notes FOR UPDATE USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "admins delete admin notes" ON public.admin_notes FOR DELETE USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_admin_notes_updated BEFORE UPDATE ON public.admin_notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- pipeline auto-log trigger
CREATE OR REPLACE FUNCTION public.log_pipeline_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.pipeline_stage IS DISTINCT FROM OLD.pipeline_stage THEN
    INSERT INTO public.pipeline_history(application_id, from_stage, to_stage, changed_by)
    VALUES (NEW.id, OLD.pipeline_stage, NEW.pipeline_stage, auth.uid());
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_applications_pipeline ON public.applications;
CREATE TRIGGER trg_applications_pipeline
  AFTER UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.log_pipeline_change();

-- seed tracks if empty
INSERT INTO public.tracks (slug, name, tagline, description, duration_weeks, capacity, skills, outcomes, status)
SELECT * FROM (VALUES
  ('full-stack','Full-Stack Engineering','Ship production web apps end-to-end.','Master modern React, TypeScript, TanStack Start, Node, and Postgres to build production-grade web products.',12,60,ARRAY['React','TypeScript','Node.js','Postgres','TanStack','TailwindCSS'],ARRAY['Portfolio of 3 shipped apps','Production deployment experience','Code review discipline'],'active'),
  ('ai-ml','AI / Machine Learning','Applied AI for real business problems.','Applied machine learning, LLM orchestration, embeddings, RAG pipelines and model evaluation.',12,40,ARRAY['Python','PyTorch','LangChain','Embeddings','LLM Ops'],ARRAY['Deployed ML service','LLM-powered product build','Model evaluation report'],'active'),
  ('data','Data Analytics & BI','Turn raw data into decisions.','SQL mastery, warehouse modelling, dashboards and analytics engineering with dbt and BI tools.',10,40,ARRAY['SQL','Python','dbt','Looker','Warehouse modelling'],ARRAY['Analytics case study','Dashboard portfolio','Data pipeline in production'],'active'),
  ('product','Product & Design','Craft outcomes users love.','End-to-end product thinking, UX research, prototyping and shipping with engineering.',10,30,ARRAY['Figma','User research','Prototyping','PRDs','Analytics'],ARRAY['Shipped product feature','User research report','Design system contribution'],'active')
) AS v(slug,name,tagline,description,duration_weeks,capacity,skills,outcomes,status)
WHERE NOT EXISTS (SELECT 1 FROM public.tracks);
