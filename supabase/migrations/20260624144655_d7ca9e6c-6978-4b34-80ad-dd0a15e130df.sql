
-- ===== users table =====
DROP POLICY IF EXISTS "Anyone can count users" ON public.users;

DROP POLICY IF EXISTS "Users can view own record" ON public.users;
CREATE POLICY "Users can view own record" ON public.users
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Prevent role / company_id self-escalation via trigger
CREATE OR REPLACE FUNCTION public.prevent_role_self_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  jwt_role text;
BEGIN
  jwt_role := current_setting('request.jwt.claims', true)::jsonb->>'role';
  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    RAISE EXCEPTION 'Changing role or company_id is not allowed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_role_self_update_trg ON public.users;
CREATE TRIGGER prevent_role_self_update_trg
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_update();

-- ===== gd_scores: candidate self-read =====
DROP POLICY IF EXISTS "Candidates can view own gd scores" ON public.gd_scores;
CREATE POLICY "Candidates can view own gd scores" ON public.gd_scores
  FOR SELECT TO authenticated
  USING (
    candidate_id IN (
      SELECT u.id FROM public.users u WHERE u.user_id = auth.uid()
    )
  );

-- ===== Inline GD helper functions, then drop them =====
DROP POLICY IF EXISTS "Candidates can view own GDs" ON public.group_discussions;
CREATE POLICY "Candidates can view own GDs" ON public.group_discussions
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.gd_groups g, public.users u
    WHERE g.gd_id = group_discussions.id
      AND u.user_id = auth.uid()
      AND u.id = ANY(g.candidate_ids)
  )
);

DROP POLICY IF EXISTS "Staff can view GD groups" ON public.gd_groups;
CREATE POLICY "Staff can view GD groups" ON public.gd_groups
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.group_discussions gd
    JOIN public.users u ON u.company_id = gd.company_id
    WHERE gd.id = gd_groups.gd_id
      AND u.user_id = auth.uid()
      AND u.role IN ('owner','superadmin','hr','manager')
  )
);

DROP FUNCTION IF EXISTS public.is_candidate_in_gd(uuid);
DROP FUNCTION IF EXISTS public.is_staff_for_gd(uuid);

-- ===== Storage: photos bucket =====
DROP POLICY IF EXISTS "Anyone can view photos" ON storage.objects;
DROP POLICY IF EXISTS "Candidates can upload photos" ON storage.objects;

CREATE POLICY "Photo owner can list own photos" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'photos'
  AND (storage.foldername(name))[1] IN (
    SELECT u.id::text FROM public.users u WHERE u.user_id = auth.uid()
  )
);

CREATE POLICY "Users can upload to own photos folder" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'photos'
  AND (storage.foldername(name))[1] IN (
    SELECT u.id::text FROM public.users u WHERE u.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own photos" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'photos'
  AND (storage.foldername(name))[1] IN (
    SELECT u.id::text FROM public.users u WHERE u.user_id = auth.uid()
  )
);

-- ===== Storage: resumes bucket =====
DROP POLICY IF EXISTS "Authenticated users can read resumes" ON storage.objects;
DROP POLICY IF EXISTS "Candidates can view own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Candidates can upload resumes" ON storage.objects;

CREATE POLICY "Candidates read own resumes" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] IN (
    SELECT u.id::text FROM public.users u WHERE u.user_id = auth.uid()
  )
);

CREATE POLICY "Staff read company resumes" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] IN (
    SELECT a.candidate_id::text
    FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    JOIN public.users u ON u.company_id = j.company_id
    WHERE u.user_id = auth.uid()
      AND u.role IN ('owner','superadmin','hr','manager')
  )
);

CREATE POLICY "Candidates upload resumes to own folder" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] IN (
    SELECT u.id::text FROM public.users u
    WHERE u.user_id = auth.uid()
  )
);

-- ===== Storage: bgv-documents bucket =====
DROP POLICY IF EXISTS "Staff can view bgv docs" ON storage.objects;

CREATE POLICY "Candidates read own bgv docs" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'bgv-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Staff read company bgv docs" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'bgv-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT (au.id)::text
    FROM public.users au
    WHERE au.user_id IN (
      SELECT a.candidate_id_user
      FROM (
        SELECT b.candidate_id AS candidate_id_user
        FROM public.bgv_documents b
        JOIN public.applications app ON app.id = b.application_id
        JOIN public.jobs j ON j.id = app.job_id
        JOIN public.users u ON u.company_id = j.company_id
        WHERE u.user_id = auth.uid()
          AND u.role IN ('owner','superadmin','hr','manager')
      ) a
    )
  )
  OR (
    bucket_id = 'bgv-documents'
    AND EXISTS (
      SELECT 1
      FROM public.bgv_documents b
      JOIN public.applications app ON app.id = b.application_id
      JOIN public.jobs j ON j.id = app.job_id
      JOIN public.users u ON u.company_id = j.company_id
      WHERE u.user_id = auth.uid()
        AND u.role IN ('owner','superadmin','hr','manager')
        AND b.file_url = storage.objects.name
    )
  )
);

-- ===== Storage: offer-letters bucket =====
DROP POLICY IF EXISTS "Staff can view offer letters" ON storage.objects;

CREATE POLICY "Candidates read own offer letters" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'offer-letters'
  AND (storage.foldername(name))[1] IN (
    SELECT u.id::text FROM public.users u WHERE u.user_id = auth.uid()
  )
);

CREATE POLICY "Staff read company offer letters" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'offer-letters'
  AND (storage.foldername(name))[1] IN (
    SELECT ol.candidate_id::text
    FROM public.offer_letters ol
    JOIN public.users u ON u.company_id = ol.company_id
    WHERE u.user_id = auth.uid()
      AND u.role IN ('owner','superadmin','hr','manager')
  )
);

-- ===== Realtime: default-deny broadcast/presence =====
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny realtime messages by default" ON realtime.messages;
CREATE POLICY "deny realtime messages by default" ON realtime.messages
FOR SELECT TO authenticated
USING (false);
