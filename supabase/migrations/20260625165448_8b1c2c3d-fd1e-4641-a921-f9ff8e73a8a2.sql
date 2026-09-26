
CREATE OR REPLACE FUNCTION public.applications_block_candidate_tamper()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role text;
BEGIN
  SELECT role INTO v_role FROM public.users WHERE user_id = auth.uid();
  IF v_role IS NULL OR v_role <> 'candidate' THEN RETURN NEW; END IF;
  IF NEW.candidate_id IS DISTINCT FROM OLD.candidate_id
     OR NEW.job_id IS DISTINCT FROM OLD.job_id
     OR NEW.stage IS DISTINCT FROM OLD.stage
     OR NEW.ai_score IS DISTINCT FROM OLD.ai_score
     OR NEW.resume_score IS DISTINCT FROM OLD.resume_score
     OR NEW.video_score IS DISTINCT FROM OLD.video_score
     OR NEW.technical_score IS DISTINCT FROM OLD.technical_score
     OR NEW.aptitude_score IS DISTINCT FROM OLD.aptitude_score
     OR NEW.gd_score IS DISTINCT FROM OLD.gd_score
     OR NEW.interview_score IS DISTINCT FROM OLD.interview_score
     OR NEW.verdict IS DISTINCT FROM OLD.verdict
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.rejected_at IS DISTINCT FROM OLD.rejected_at
     OR NEW.hired_at IS DISTINCT FROM OLD.hired_at
  THEN
    RAISE EXCEPTION 'Candidates cannot modify scoring, stage, status or verdict fields';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS applications_block_candidate_tamper_trg ON public.applications;
CREATE TRIGGER applications_block_candidate_tamper_trg
BEFORE UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.applications_block_candidate_tamper();

CREATE OR REPLACE FUNCTION public.users_block_role_self_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_caller_role text;
BEGIN
  IF NEW.user_id = auth.uid() THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.company_id IS DISTINCT FROM OLD.company_id THEN
      SELECT role INTO v_caller_role FROM public.users WHERE user_id = auth.uid();
      IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner','superadmin') THEN
        RAISE EXCEPTION 'You cannot change your own role or company assignment';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS users_block_role_self_update_trg ON public.users;
CREATE TRIGGER users_block_role_self_update_trg
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.users_block_role_self_update();

DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='companies' AND cmd='SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.companies', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "companies_member_select_full"
ON public.companies FOR SELECT TO authenticated
USING (
  id IN (SELECT company_id FROM public.users WHERE user_id = auth.uid())
);

CREATE OR REPLACE VIEW public.companies_public AS
SELECT id, company_name, industry, location
FROM public.companies;

GRANT SELECT ON public.companies_public TO anon, authenticated;

DROP POLICY IF EXISTS "resumes_owner_update" ON storage.objects;
CREATE POLICY "resumes_owner_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "bgv_documents_owner_update" ON storage.objects;
CREATE POLICY "bgv_documents_owner_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'bgv-documents' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'bgv-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
