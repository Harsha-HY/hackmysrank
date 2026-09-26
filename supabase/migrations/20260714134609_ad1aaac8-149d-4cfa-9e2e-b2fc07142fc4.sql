ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS resume_cutoff INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS applications_deleted_at_idx ON public.applications(deleted_at);
ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS naukri_url TEXT,
  ADD COLUMN IF NOT EXISTS indeed_url TEXT,
  ADD COLUMN IF NOT EXISTS github_url TEXT,
  ADD COLUMN IF NOT EXISTS portfolio_url TEXT;