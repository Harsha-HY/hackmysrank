
-- 1) Re-publish jobs to realtime with a column list that excludes aptitude_questions
ALTER PUBLICATION supabase_realtime DROP TABLE public.jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs
  (id, title, department, manager_id, salary_min, salary_max, location, work_type,
   experience_min, experience_max, skills_required, job_description, posted_by,
   company_id, status, applications_count, created_at, updated_at, aptitude_cutoff,
   embedding_source, embedded_at);

-- 2) Fix prep_sessions RLS: candidate_id references users.id, not auth.uid()
DROP POLICY IF EXISTS "Candidates manage own prep sessions" ON public.prep_sessions;
CREATE POLICY "Candidates manage own prep sessions"
ON public.prep_sessions
FOR ALL
TO authenticated
USING (candidate_id IN (SELECT id FROM public.users WHERE user_id = auth.uid()))
WITH CHECK (candidate_id IN (SELECT id FROM public.users WHERE user_id = auth.uid()));

-- 3) Fix storage update policies for resumes & bgv-documents
DROP POLICY IF EXISTS "resumes_owner_update" ON storage.objects;
CREATE POLICY "resumes_owner_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.users WHERE user_id = auth.uid())
)
WITH CHECK (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.users WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "bgv_documents_owner_update" ON storage.objects;
CREATE POLICY "bgv_documents_owner_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'bgv-documents'
  AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.users WHERE user_id = auth.uid())
)
WITH CHECK (
  bucket_id = 'bgv-documents'
  AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.users WHERE user_id = auth.uid())
);

-- 4) Defense-in-depth: revoke column-level UPDATE on role/company_id from authenticated.
-- Service role (and edge functions) keep full access. Existing triggers remain as a second layer.
REVOKE UPDATE (role, company_id) ON public.users FROM authenticated;
REVOKE UPDATE (role, company_id) ON public.users FROM anon;
