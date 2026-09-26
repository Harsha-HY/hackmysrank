-- 1) companies: column-level restriction for anon/authenticated
REVOKE SELECT ON public.companies FROM anon, authenticated;

GRANT SELECT (id, company_name, industry, location, slug, tagline, logo_url, banner_url, about, website, company_size, founded_year, office_photos, tech_stack, benefits, created_at, updated_at)
  ON public.companies TO anon;

GRANT SELECT (id, company_name, industry, location, slug, tagline, logo_url, banner_url, about, website, company_size, founded_year, office_photos, tech_stack, benefits, avg_response_days, created_at, updated_at)
  ON public.companies TO authenticated;

CREATE OR REPLACE FUNCTION public.owner_companies_full()
RETURNS SETOF public.companies
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.* FROM public.companies c
  WHERE EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.user_id = auth.uid()
      AND (u.role = 'owner' OR (u.role = 'superadmin' AND u.company_id = c.id))
  )
  OR c.owner_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.owner_companies_full() TO authenticated;

-- 2) gd_groups: company-scoped insert
DROP POLICY IF EXISTS "Staff can insert GD groups" ON public.gd_groups;
CREATE POLICY "Staff can insert GD groups" ON public.gd_groups
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.group_discussions gd
    JOIN public.users u ON u.company_id = gd.company_id
    WHERE gd.id = gd_groups.gd_id
      AND u.user_id = auth.uid()
      AND u.role = ANY (ARRAY['owner','superadmin','hr','manager'])
  )
);

-- 3) storage: offer-letters upload must target own company's candidate folder
DROP POLICY IF EXISTS "Staff can upload offer letters" ON storage.objects;
CREATE POLICY "Staff can upload offer letters" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'offer-letters'
  AND (storage.foldername(name))[1] IN (
    SELECT (ol.candidate_id)::text
    FROM public.offer_letters ol
    JOIN public.users u ON u.company_id = ol.company_id
    WHERE u.user_id = auth.uid()
      AND u.role = ANY (ARRAY['owner','superadmin','hr','manager'])
  )
);