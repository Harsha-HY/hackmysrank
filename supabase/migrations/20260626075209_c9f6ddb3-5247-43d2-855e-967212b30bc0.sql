
ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS built_resume jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS use_built_resume boolean DEFAULT false;
