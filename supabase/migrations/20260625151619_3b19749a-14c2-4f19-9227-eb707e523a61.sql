
-- 1. BGV folder mismatch: fix policy to use users.id
DROP POLICY IF EXISTS "Candidates read own bgv docs" ON storage.objects;
CREATE POLICY "Candidates read own bgv docs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'bgv-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT (u.id)::text FROM public.users u WHERE u.user_id = auth.uid()
  )
);

-- 2. Companies: hide sensitive columns from anon
REVOKE SELECT (company_code, owner_id, plan, status) ON public.companies FROM anon;

-- 3. Jobs: hide aptitude_questions from anon AND authenticated; hide aptitude_cutoff from anon
REVOKE SELECT (aptitude_questions) ON public.jobs FROM anon, authenticated;
REVOKE SELECT (aptitude_cutoff) ON public.jobs FROM anon;

-- Secure-definer RPCs so staff can still read questions, candidate can still read their cutoff
CREATE OR REPLACE FUNCTION public.get_job_aptitude_questions(_job_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT j.aptitude_questions
  FROM public.jobs j
  JOIN public.users u ON u.company_id = j.company_id
  WHERE j.id = _job_id
    AND u.user_id = auth.uid()
    AND u.role = ANY (ARRAY['owner','superadmin','hr','manager']);
$$;
REVOKE ALL ON FUNCTION public.get_job_aptitude_questions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_job_aptitude_questions(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_job_aptitude_cutoff(_job_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT aptitude_cutoff FROM public.jobs WHERE id = _job_id;
$$;
REVOKE ALL ON FUNCTION public.get_job_aptitude_cutoff(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_job_aptitude_cutoff(uuid) TO authenticated;

-- 4. Users table: staff can view colleagues/candidates without recursion
CREATE OR REPLACE FUNCTION public.current_user_company()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT company_id FROM public.users WHERE user_id = auth.uid() LIMIT 1; $$;
REVOKE ALL ON FUNCTION public.current_user_company() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_company() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_company_staff()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE user_id = auth.uid()
      AND role = ANY (ARRAY['owner','superadmin','hr','manager'])
  );
$$;
REVOKE ALL ON FUNCTION public.is_company_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_company_staff() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_candidate_for_my_company(_candidate_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    JOIN public.users u ON u.company_id = j.company_id
    WHERE u.user_id = auth.uid()
      AND u.role = ANY (ARRAY['owner','superadmin','hr','manager'])
      AND a.candidate_id = _candidate_id
  );
$$;
REVOKE ALL ON FUNCTION public.is_candidate_for_my_company(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_candidate_for_my_company(uuid) TO authenticated;

DROP POLICY IF EXISTS "Staff can view company colleagues" ON public.users;
CREATE POLICY "Staff can view company colleagues"
ON public.users FOR SELECT TO authenticated
USING (
  public.is_company_staff()
  AND company_id IS NOT NULL
  AND company_id = public.current_user_company()
);

DROP POLICY IF EXISTS "Staff can view their candidates" ON public.users;
CREATE POLICY "Staff can view their candidates"
ON public.users FOR SELECT TO authenticated
USING (
  public.is_company_staff()
  AND role = 'candidate'
  AND public.is_candidate_for_my_company(id)
);

-- 5. Storage DELETE policies
-- Candidates can delete their own files
CREATE POLICY "Candidates delete own resumes"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] IN (SELECT (u.id)::text FROM public.users u WHERE u.user_id = auth.uid())
);
CREATE POLICY "Candidates delete own videos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'videos'
  AND (storage.foldername(name))[1] IN (SELECT (u.id)::text FROM public.users u WHERE u.user_id = auth.uid())
);
CREATE POLICY "Candidates delete own photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'photos'
  AND (storage.foldername(name))[1] IN (SELECT (u.id)::text FROM public.users u WHERE u.user_id = auth.uid())
);
CREATE POLICY "Candidates delete own bgv docs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'bgv-documents'
  AND (storage.foldername(name))[1] IN (SELECT (u.id)::text FROM public.users u WHERE u.user_id = auth.uid())
);

-- Staff can delete files tied to their company
CREATE POLICY "Staff delete company resumes"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] IN (
    SELECT (a.candidate_id)::text FROM applications a
    JOIN jobs j ON j.id = a.job_id
    JOIN users u ON u.company_id = j.company_id
    WHERE u.user_id = auth.uid() AND u.role = ANY (ARRAY['owner','superadmin','hr','manager'])
  )
);
CREATE POLICY "Staff delete company videos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'videos'
  AND (storage.foldername(name))[1] IN (
    SELECT (a.candidate_id)::text FROM applications a
    JOIN jobs j ON j.id = a.job_id
    JOIN users u ON u.company_id = j.company_id
    WHERE u.user_id = auth.uid() AND u.role = ANY (ARRAY['owner','superadmin','hr','manager'])
  )
);
CREATE POLICY "Staff delete company offer letters"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'offer-letters'
  AND (storage.foldername(name))[1] IN (
    SELECT (ol.candidate_id)::text FROM offer_letters ol
    JOIN users u ON u.company_id = ol.company_id
    WHERE u.user_id = auth.uid() AND u.role = ANY (ARRAY['owner','superadmin','hr','manager'])
  )
);
CREATE POLICY "Staff delete company bgv docs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'bgv-documents'
  AND EXISTS (
    SELECT 1 FROM bgv_documents b
    JOIN applications app ON app.id = b.application_id
    JOIN jobs j ON j.id = app.job_id
    JOIN users u ON u.company_id = j.company_id
    WHERE u.user_id = auth.uid()
      AND u.role = ANY (ARRAY['owner','superadmin','hr','manager'])
      AND b.file_url = storage.objects.name
  )
);

-- 6. Photos: bucket becomes private; add staff cross-candidate read
CREATE POLICY "Staff read company candidate photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'photos'
  AND (storage.foldername(name))[1] IN (
    SELECT (a.candidate_id)::text FROM applications a
    JOIN jobs j ON j.id = a.job_id
    JOIN users u ON u.company_id = j.company_id
    WHERE u.user_id = auth.uid() AND u.role = ANY (ARRAY['owner','superadmin','hr','manager'])
  )
);
