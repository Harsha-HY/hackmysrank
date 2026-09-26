-- Ensure public company profile columns exist and are safely readable
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

UPDATE public.companies
SET slug = lower(regexp_replace(regexp_replace(company_name, '[^a-zA-Z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g')) || '-' || substr(id::text, 1, 6)
WHERE slug IS NULL OR slug = '';

CREATE UNIQUE INDEX IF NOT EXISTS companies_slug_unique_idx ON public.companies(slug);

DROP VIEW IF EXISTS public.company_public_profiles;
CREATE VIEW public.company_public_profiles
WITH (security_invoker = true) AS
SELECT
  id, slug, company_name, industry, location, tagline, logo_url, banner_url,
  about, website, company_size, founded_year, office_photos, tech_stack, benefits,
  avg_response_days, created_at
FROM public.companies;

GRANT SELECT ON public.company_public_profiles TO anon, authenticated;
GRANT SELECT (id, slug, company_name, industry, location, tagline, logo_url, banner_url, about, website, company_size, founded_year, office_photos, tech_stack, benefits, avg_response_days, created_at) ON public.companies TO anon, authenticated;
GRANT UPDATE (company_name, slug, tagline, logo_url, banner_url, about, website, company_size, founded_year, office_photos, tech_stack, benefits, avg_response_days, industry, location, updated_at) ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;

DROP POLICY IF EXISTS "Public can read company profile fields" ON public.companies;
CREATE POLICY "Public can read company profile fields" ON public.companies
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Company admins can update profile fields" ON public.companies;
CREATE POLICY "Company admins can update profile fields" ON public.companies
  FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.user_id = auth.uid()
        AND u.company_id = companies.id
        AND u.role IN ('owner', 'superadmin')
    )
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.user_id = auth.uid()
        AND u.company_id = companies.id
        AND u.role IN ('owner', 'superadmin')
    )
  );

-- Storage policies for public profile images
DROP POLICY IF EXISTS "company_assets_public_read" ON storage.objects;
CREATE POLICY "company_assets_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'company-assets');

DROP POLICY IF EXISTS "company_assets_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "company_assets_admin_write" ON storage.objects;
CREATE POLICY "company_assets_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'company-assets'
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.user_id = auth.uid()
        AND u.role IN ('owner','superadmin')
        AND u.company_id::text = split_part(name, '/', 1)
    )
  );

DROP POLICY IF EXISTS "company_assets_admin_update" ON storage.objects;
CREATE POLICY "company_assets_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.user_id = auth.uid()
        AND u.role IN ('owner','superadmin')
        AND u.company_id::text = split_part(name, '/', 1)
    )
  )
  WITH CHECK (
    bucket_id = 'company-assets'
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.user_id = auth.uid()
        AND u.role IN ('owner','superadmin')
        AND u.company_id::text = split_part(name, '/', 1)
    )
  );

DROP POLICY IF EXISTS "company_assets_admin_delete" ON storage.objects;
CREATE POLICY "company_assets_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.user_id = auth.uid()
        AND u.role IN ('owner','superadmin')
        AND u.company_id::text = split_part(name, '/', 1)
    )
  );

-- Notification columns and compatibility helpers
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'alert',
  ADD COLUMN IF NOT EXISTS link text;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id IN (SELECT u.id FROM public.users u WHERE u.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.normalize_notification_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mapped_user_id uuid;
BEGIN
  SELECT u.id INTO mapped_user_id
  FROM public.users u
  WHERE u.id = NEW.user_id OR u.user_id = NEW.user_id
  ORDER BY CASE WHEN u.id = NEW.user_id THEN 0 ELSE 1 END
  LIMIT 1;

  IF mapped_user_id IS NOT NULL THEN
    NEW.user_id := mapped_user_id;
  END IF;

  IF NEW.category IS NULL OR NEW.category = '' THEN
    NEW.category := CASE
      WHEN lower(coalesce(NEW.title,'') || ' ' || coalesce(NEW.message,'')) ~ 'message|chat' THEN 'message'
      WHEN lower(coalesce(NEW.title,'') || ' ' || coalesce(NEW.message,'')) ~ 'test|aptitude|technical|assessment|video' THEN 'test'
      WHEN lower(coalesce(NEW.title,'') || ' ' || coalesce(NEW.message,'')) ~ 'violation|warning|alert|copy|tab' THEN 'alert'
      ELSE 'application'
    END;
  END IF;

  IF NEW.type IS NULL OR NEW.type = '' OR NEW.type = 'info' THEN
    NEW.type := CASE
      WHEN NEW.category = 'message' THEN 'message'
      WHEN NEW.category = 'test' THEN 'test'
      WHEN NEW.category = 'alert' THEN 'alert'
      ELSE 'stage'
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_notification_user_id_trg ON public.notifications;
CREATE TRIGGER normalize_notification_user_id_trg
BEFORE INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.normalize_notification_user_id();

-- Notification preferences: keep existing table and provide requested user_preferences name
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
DROP POLICY IF EXISTS "Users manage own prefs" ON public.user_notification_preferences;
CREATE POLICY "Users manage own prefs" ON public.user_notification_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP VIEW IF EXISTS public.user_preferences;
CREATE VIEW public.user_preferences
WITH (security_invoker = true) AS
SELECT * FROM public.user_notification_preferences;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;