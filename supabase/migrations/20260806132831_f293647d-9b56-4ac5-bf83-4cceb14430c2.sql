ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS employment_type text NOT NULL DEFAULT 'Full-time';
ALTER TABLE public.job_templates ADD COLUMN IF NOT EXISTS employment_type text;
GRANT SELECT (employment_type) ON public.jobs TO anon, authenticated;
GRANT INSERT (employment_type), UPDATE (employment_type) ON public.jobs TO authenticated;