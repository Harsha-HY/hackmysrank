
ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS certifications jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS achievements jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS languages jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS interests jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS volunteer_work jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS publications jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS courses jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS honors jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS resume_url text;

-- Storage policies for certificates folder under bgv-documents (reuse) and photos bucket already exist.
-- Ensure candidates can upload PDFs to their own folder in bgv-documents bucket (already covered by existing policies if pathed by user_id).

-- Add a dedicated 'certificates' folder convention to bgv-documents. Add UPDATE policy already exists. We are fine.
