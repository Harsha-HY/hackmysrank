-- Public company branding must be readable by job seekers (anon + candidates),
-- while the internal company_code stays owner-only.
REVOKE SELECT ON public.companies FROM authenticated;
REVOKE SELECT ON public.companies FROM anon;

GRANT SELECT (
  id, company_name, industry, location, status, slug, tagline, logo_url, banner_url,
  about, website, company_size, founded_year, office_photos, tech_stack, benefits,
  avg_response_days, created_at, updated_at
) ON public.companies TO anon;

GRANT SELECT (
  id, company_name, industry, location, status, plan, owner_id, slug, tagline, logo_url,
  banner_url, about, website, company_size, founded_year, office_photos, tech_stack,
  benefits, avg_response_days, created_at, updated_at
) ON public.companies TO authenticated;

GRANT ALL ON public.companies TO service_role;

DROP POLICY IF EXISTS "Public can view company branding" ON public.companies;
CREATE POLICY "Public can view company branding"
  ON public.companies FOR SELECT
  TO anon, authenticated
  USING (true);

-- Owners still need the private join code: expose it through a scoped function.
CREATE OR REPLACE FUNCTION public.owner_company_codes()
RETURNS TABLE (id uuid, company_code text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.company_code
  FROM public.companies c
  WHERE c.owner_id IN (
    SELECT u.id FROM public.users u
    WHERE u.user_id = auth.uid() AND u.role IN ('owner', 'superadmin')
  );
$$;

REVOKE ALL ON FUNCTION public.owner_company_codes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owner_company_codes() TO authenticated;