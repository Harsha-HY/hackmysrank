ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS aptitude_screen_recording_url TEXT,
  ADD COLUMN IF NOT EXISTS technical_screen_recording_url TEXT;