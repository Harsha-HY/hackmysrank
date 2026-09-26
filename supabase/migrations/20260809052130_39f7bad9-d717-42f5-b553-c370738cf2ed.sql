-- 1) companies: column-level read restriction to branding fields only
REVOKE SELECT ON public.companies FROM anon, authenticated;

GRANT SELECT (
  id, company_name, slug, tagline, about, website, industry, location,
  company_size, founded_year, avg_response_days, logo_url, banner_url,
  office_photos, tech_stack, benefits, created_at, updated_at
) ON public.companies TO anon, authenticated;

GRANT ALL ON public.companies TO service_role;

-- 2) candidate_profiles: scope staff reads to candidates who applied to their company
DROP POLICY IF EXISTS "Staff can view candidate profiles" ON public.candidate_profiles;

CREATE POLICY "Staff can view applicant profiles"
ON public.candidate_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users cu
    WHERE cu.user_id = public.candidate_profiles.user_id
      AND public.is_candidate_for_my_company(cu.id)
  )
);

-- 3) storage: prevent candidates overwriting verified BGV documents
DROP POLICY IF EXISTS bgv_documents_owner_update ON storage.objects;

CREATE POLICY bgv_documents_owner_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'bgv-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT u.id::text FROM public.users u WHERE u.user_id = auth.uid()
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.bgv_documents b
    WHERE b.file_url = storage.objects.name AND b.verified = true
  )
)
WITH CHECK (
  bucket_id = 'bgv-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT u.id::text FROM public.users u WHERE u.user_id = auth.uid()
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.bgv_documents b
    WHERE b.file_url = storage.objects.name AND b.verified = true
  )
);