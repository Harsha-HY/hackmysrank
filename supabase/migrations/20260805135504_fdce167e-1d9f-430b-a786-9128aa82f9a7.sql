-- Limit anonymous/public exposure of companies to branding columns only.
REVOKE ALL ON public.companies FROM anon;

GRANT SELECT (
  id, company_name, slug, tagline, logo_url, banner_url, about, website,
  industry, location, company_size, founded_year, office_photos, tech_stack,
  benefits, avg_response_days, status
) ON public.companies TO anon;

-- Split the shared public policy: anon gets branding-only (column grants above),
-- authenticated keeps its existing read access via a separate policy.
DROP POLICY IF EXISTS "Public can view company branding" ON public.companies;

CREATE POLICY "Anon can view company branding"
ON public.companies FOR SELECT TO anon USING (true);

CREATE POLICY "Authenticated can view company branding"
ON public.companies FOR SELECT TO authenticated USING (true);
