
-- Extend assessments table
ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS cohort text,
  ADD COLUMN IF NOT EXISTS difficulty text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS deadline timestamptz,
  ADD COLUMN IF NOT EXISTS total_marks integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assessment_type text NOT NULL DEFAULT 'mixed',
  ADD COLUMN IF NOT EXISTS instructions text,
  ADD COLUMN IF NOT EXISTS negative_marking boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shuffle_questions boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shuffle_options boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS allow_review boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS violation_limit integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS anti_cheat jsonb NOT NULL DEFAULT '{"tab_switch": true, "blur": true, "fullscreen": false}'::jsonb;

-- Question types enum
DO $$ BEGIN
  CREATE TYPE public.question_type AS ENUM ('mcq','multi_select','true_false','short_answer','long_answer','coding','file_upload','case_study','video_response');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.attempt_status AS ENUM ('in_progress','submitted','auto_submitted','abandoned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- assessment_questions
CREATE TABLE IF NOT EXISTS public.assessment_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  type public.question_type NOT NULL DEFAULT 'mcq',
  prompt text NOT NULL,
  description text,
  image_url text,
  attachment_url text,
  marks numeric NOT NULL DEFAULT 1,
  negative_marks numeric NOT NULL DEFAULT 0,
  difficulty text NOT NULL DEFAULT 'medium',
  est_time_seconds integer NOT NULL DEFAULT 60,
  tags text[] NOT NULL DEFAULT '{}',
  explanation text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_answer jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_questions TO authenticated;
GRANT ALL ON public.assessment_questions TO service_role;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage questions" ON public.assessment_questions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "candidates read questions of accessible assessments" ON public.assessment_questions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_id
        AND (a.status = 'published' OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE INDEX IF NOT EXISTS idx_questions_assessment ON public.assessment_questions(assessment_id, order_index);
CREATE TRIGGER trg_questions_updated BEFORE UPDATE ON public.assessment_questions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- assessment_attempts
CREATE TABLE IF NOT EXISTS public.assessment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  status public.attempt_status NOT NULL DEFAULT 'in_progress',
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  time_spent_seconds integer NOT NULL DEFAULT 0,
  score numeric NOT NULL DEFAULT 0,
  max_score numeric NOT NULL DEFAULT 0,
  percentage numeric NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  violations_count integer NOT NULL DEFAULT 0,
  current_question_index integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_attempts TO authenticated;
GRANT ALL ON public.assessment_attempts TO service_role;
ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage attempts" ON public.assessment_attempts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "users manage own attempts" ON public.assessment_attempts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_attempts_user ON public.assessment_attempts(user_id, assessment_id);
CREATE INDEX IF NOT EXISTS idx_attempts_assessment ON public.assessment_attempts(assessment_id);
CREATE TRIGGER trg_attempts_updated BEFORE UPDATE ON public.assessment_attempts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- attempt_answers
CREATE TABLE IF NOT EXISTS public.attempt_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.assessment_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.assessment_questions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  answer jsonb,
  marks_awarded numeric NOT NULL DEFAULT 0,
  is_correct boolean,
  time_spent_seconds integer NOT NULL DEFAULT 0,
  marked_for_review boolean NOT NULL DEFAULT false,
  autosaved_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(attempt_id, question_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attempt_answers TO authenticated;
GRANT ALL ON public.attempt_answers TO service_role;
ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage attempt answers" ON public.attempt_answers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "users manage own attempt answers" ON public.attempt_answers
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt ON public.attempt_answers(attempt_id);
CREATE TRIGGER trg_attempt_answers_updated BEFORE UPDATE ON public.attempt_answers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- assessment_violations
CREATE TABLE IF NOT EXISTS public.assessment_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.assessment_attempts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  type text NOT NULL,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.assessment_violations TO authenticated;
GRANT ALL ON public.assessment_violations TO service_role;
ALTER TABLE public.assessment_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read violations" ON public.assessment_violations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "users insert own violations" ON public.assessment_violations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users read own violations" ON public.assessment_violations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_violations_attempt ON public.assessment_violations(attempt_id);

-- question_categories
CREATE TABLE IF NOT EXISTS public.question_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.question_categories TO authenticated;
GRANT ALL ON public.question_categories TO service_role;
ALTER TABLE public.question_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage question categories" ON public.question_categories
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "auth read question categories" ON public.question_categories
  FOR SELECT TO authenticated USING (true);
CREATE TRIGGER trg_qcat_updated BEFORE UPDATE ON public.question_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- question_bank
CREATE TABLE IF NOT EXISTS public.question_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.question_type NOT NULL DEFAULT 'mcq',
  prompt text NOT NULL,
  description text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_answer jsonb,
  explanation text,
  marks numeric NOT NULL DEFAULT 1,
  difficulty text NOT NULL DEFAULT 'medium',
  category_id uuid REFERENCES public.question_categories(id) ON DELETE SET NULL,
  tags text[] NOT NULL DEFAULT '{}',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_bank TO authenticated;
GRANT ALL ON public.question_bank TO service_role;
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage question bank" ON public.question_bank
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_qbank_updated BEFORE UPDATE ON public.question_bank
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- assessment_assignments (per-user assignment)
CREATE TABLE IF NOT EXISTS public.assessment_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  assigned_by uuid,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(assessment_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_assignments TO authenticated;
GRANT ALL ON public.assessment_assignments TO service_role;
ALTER TABLE public.assessment_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage assignments" ON public.assessment_assignments
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "users read own assignments" ON public.assessment_assignments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Update existing assessments SELECT policy: broaden with published + admin
DROP POLICY IF EXISTS "authenticated read active assessments" ON public.assessments;
CREATE POLICY "authenticated read published assessments" ON public.assessments
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR (status = 'published' AND is_active = true)
  );
