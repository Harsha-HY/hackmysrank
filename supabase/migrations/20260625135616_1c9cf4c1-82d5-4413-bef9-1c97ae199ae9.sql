
CREATE TABLE public.candidate_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Step 1
  photo_url text,
  full_name text,
  headline text,
  location text,
  phone text,
  about_me text,
  -- Step 2 (JSON arrays)
  experiences jsonb DEFAULT '[]'::jsonb,
  education jsonb DEFAULT '[]'::jsonb,
  skills jsonb DEFAULT '[]'::jsonb,
  -- Step 3
  current_ctc numeric,
  expected_ctc numeric,
  notice_period_days integer,
  work_types jsonb DEFAULT '[]'::jsonb,
  open_to_relocation boolean DEFAULT false,
  github_url text,
  portfolio_url text,
  linkedin_url text,
  projects jsonb DEFAULT '[]'::jsonb,
  -- Meta
  completion_percentage integer DEFAULT 0,
  profile_completed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_profiles TO authenticated;
GRANT ALL ON public.candidate_profiles TO service_role;

ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidate can view own profile"
  ON public.candidate_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Candidate can insert own profile"
  ON public.candidate_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Candidate can update own profile"
  ON public.candidate_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- HR/Manager/Superadmin/Owner can read all candidate profiles for matching
CREATE POLICY "Staff can view candidate profiles"
  ON public.candidate_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.user_id = auth.uid()
        AND u.role IN ('hr','manager','superadmin','owner')
    )
  );

CREATE TRIGGER trg_candidate_profiles_updated_at
  BEFORE UPDATE ON public.candidate_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
