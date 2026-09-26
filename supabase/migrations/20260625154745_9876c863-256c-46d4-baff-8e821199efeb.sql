
-- 1. COMPANIES
DROP POLICY IF EXISTS "Anyone can read company names" ON public.companies;
CREATE POLICY "Authenticated can read companies"
ON public.companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anon can read company basics"
ON public.companies FOR SELECT TO anon USING (true);

REVOKE SELECT ON public.companies FROM anon;
GRANT SELECT (id, company_name, industry, location, created_at) ON public.companies TO anon;

-- 2. JOBS: column-level restriction so aptitude_questions is hidden
REVOKE SELECT ON public.jobs FROM anon, authenticated;
GRANT SELECT (
  id, title, department, manager_id, salary_min, salary_max, location, work_type,
  experience_min, experience_max, skills_required, job_description, posted_by,
  company_id, status, applications_count, created_at, updated_at,
  aptitude_cutoff, embedding, embedding_source, embedded_at
) ON public.jobs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;

-- 3. USERS: trigger preventing role/company self update
DROP TRIGGER IF EXISTS prevent_role_self_update_trg ON public.users;
CREATE TRIGGER prevent_role_self_update_trg
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_update();

-- 4. CHAT_MESSAGES
DROP POLICY IF EXISTS "Users can update own messages" ON public.chat_messages;
CREATE POLICY "Receivers can mark messages read"
ON public.chat_messages FOR UPDATE TO authenticated
USING (receiver_id IN (SELECT id FROM public.users WHERE user_id = auth.uid()))
WITH CHECK (receiver_id IN (SELECT id FROM public.users WHERE user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.chat_messages_guard_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.message IS DISTINCT FROM OLD.message
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.receiver_id IS DISTINCT FROM OLD.receiver_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only is_read may be updated on chat_messages';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS chat_messages_guard_update_trg ON public.chat_messages;
CREATE TRIGGER chat_messages_guard_update_trg
BEFORE UPDATE ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.chat_messages_guard_update();

-- 5. BGV documents folder check on upload
DROP POLICY IF EXISTS "Candidates can upload bgv docs" ON storage.objects;
CREATE POLICY "Candidates can upload bgv docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'bgv-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT (u.id)::text FROM public.users u
    WHERE u.user_id = auth.uid() AND u.role = 'candidate'
  )
);

-- 6. SECURITY DEFINER functions: revoke anon
REVOKE EXECUTE ON FUNCTION public.current_user_company() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_company_staff() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_candidate_for_my_company(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_job_aptitude_questions(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_job_aptitude_cutoff(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.match_candidates_for_job(vector, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.match_jobs_for_candidate(vector, integer) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.current_user_company() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_candidate_for_my_company(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_job_aptitude_questions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_job_aptitude_cutoff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_candidates_for_job(vector, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_jobs_for_candidate(vector, integer) TO authenticated;
