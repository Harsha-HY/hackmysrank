ALTER VIEW public.company_public_profiles SET (security_invoker = true);

-- Allow anon/auth to bypass companies RLS for the view by granting SELECT on the columns the view reads.
-- The view executes as the invoker now, so we add a policy permitting public read of only the safe columns through the view path.
DROP POLICY IF EXISTS "Public can read company profile fields" ON public.companies;
CREATE POLICY "Public can read company profile fields" ON public.companies
  FOR SELECT TO anon, authenticated
  USING (true);

-- NOTE: We keep limited columns exposed via the view; the underlying table still has sensitive columns,
-- but column-level grants restrict what anon/auth can actually SELECT.
REVOKE SELECT ON public.companies FROM anon;
REVOKE SELECT ON public.companies FROM authenticated;
GRANT SELECT (id, slug, company_name, industry, location, tagline, logo_url, banner_url, about, website, company_size, founded_year, office_photos, tech_stack, benefits, avg_response_days, created_at) ON public.companies TO anon, authenticated;