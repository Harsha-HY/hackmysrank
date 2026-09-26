
-- 1. Extend companies with public profile fields
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS about text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS company_size text,
  ADD COLUMN IF NOT EXISTS founded_year int,
  ADD COLUMN IF NOT EXISTS office_photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tech_stack text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS benefits text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS avg_response_days int;

-- Backfill slugs from company_name
UPDATE public.companies
SET slug = lower(regexp_replace(regexp_replace(company_name, '[^a-zA-Z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g')) || '-' || substr(id::text, 1, 6)
WHERE slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS companies_slug_unique_idx ON public.companies(slug);

-- 2. Public view exposes ONLY safe profile columns (no plan, company_code, owner_id, status)
CREATE OR REPLACE VIEW public.company_public_profiles AS
SELECT
  id, slug, company_name, industry, location, tagline, logo_url, banner_url,
  about, website, company_size, founded_year, office_photos, tech_stack, benefits,
  avg_response_days, created_at
FROM public.companies;

GRANT SELECT ON public.company_public_profiles TO anon, authenticated;

-- 3. Notifications: add type/category/link, allow DELETE
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'alert',
  ADD COLUMN IF NOT EXISTS link text;

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id IN (SELECT users.id FROM public.users WHERE users.user_id = auth.uid()));

GRANT DELETE ON public.notifications TO authenticated;

-- 4. User notification preferences
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  push_new_application boolean NOT NULL DEFAULT true,
  push_test_submitted boolean NOT NULL DEFAULT true,
  push_stage_changed boolean NOT NULL DEFAULT true,
  push_message_received boolean NOT NULL DEFAULT true,
  push_violation_detected boolean NOT NULL DEFAULT true,
  push_offer_accepted boolean NOT NULL DEFAULT true,
  email_new_application boolean NOT NULL DEFAULT false,
  email_test_submitted boolean NOT NULL DEFAULT false,
  email_stage_changed boolean NOT NULL DEFAULT true,
  email_message_received boolean NOT NULL DEFAULT false,
  email_violation_detected boolean NOT NULL DEFAULT true,
  email_offer_accepted boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_notification_preferences TO authenticated;
GRANT ALL ON public.user_notification_preferences TO service_role;

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own prefs" ON public.user_notification_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_user_notification_prefs_updated_at
  BEFORE UPDATE ON public.user_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
