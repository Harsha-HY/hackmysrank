CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

CREATE OR REPLACE FUNCTION private.current_user_company()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.users WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.is_company_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE user_id = auth.uid()
      AND role = ANY (ARRAY['owner','superadmin','hr','manager'])
  );
$$;

CREATE OR REPLACE FUNCTION private.is_hr_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE user_id = auth.uid()
      AND role = ANY (ARRAY['owner','superadmin','hr','manager'])
  );
$$;

CREATE OR REPLACE FUNCTION private.is_candidate_for_my_company(_candidate_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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

GRANT EXECUTE ON FUNCTION private.current_user_company() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_company_staff() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_hr_or_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_candidate_for_my_company(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "HR/Admin can delete notes" ON public.candidate_notes;
CREATE POLICY "HR/Admin can delete notes"
ON public.candidate_notes
FOR DELETE
TO authenticated
USING (private.is_hr_or_admin() AND private.is_candidate_for_my_company(candidate_id));

DROP POLICY IF EXISTS "HR/Admin can insert notes" ON public.candidate_notes;
CREATE POLICY "HR/Admin can insert notes"
ON public.candidate_notes
FOR INSERT
TO authenticated
WITH CHECK (private.is_hr_or_admin() AND created_by = auth.uid() AND private.is_candidate_for_my_company(candidate_id));

DROP POLICY IF EXISTS "HR/Admin can update notes" ON public.candidate_notes;
CREATE POLICY "HR/Admin can update notes"
ON public.candidate_notes
FOR UPDATE
TO authenticated
USING (private.is_hr_or_admin() AND private.is_candidate_for_my_company(candidate_id))
WITH CHECK (private.is_hr_or_admin() AND private.is_candidate_for_my_company(candidate_id));

DROP POLICY IF EXISTS "HR/Admin can view notes" ON public.candidate_notes;
CREATE POLICY "HR/Admin can view notes"
ON public.candidate_notes
FOR SELECT
TO authenticated
USING (private.is_hr_or_admin() AND private.is_candidate_for_my_company(candidate_id));

DROP POLICY IF EXISTS "Company staff can view templates" ON public.job_templates;
CREATE POLICY "Company staff can view templates"
ON public.job_templates
FOR SELECT
TO authenticated
USING (company_id = private.current_user_company() AND private.is_company_staff());

DROP POLICY IF EXISTS "HR can delete templates" ON public.job_templates;
CREATE POLICY "HR can delete templates"
ON public.job_templates
FOR DELETE
TO authenticated
USING (
  company_id = private.current_user_company()
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE users.user_id = auth.uid()
      AND users.role = ANY (ARRAY['owner','superadmin','hr'])
  )
);

DROP POLICY IF EXISTS "HR can insert templates" ON public.job_templates;
CREATE POLICY "HR can insert templates"
ON public.job_templates
FOR INSERT
TO authenticated
WITH CHECK (
  company_id = private.current_user_company()
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE users.user_id = auth.uid()
      AND users.role = ANY (ARRAY['owner','superadmin','hr'])
  )
);

DROP POLICY IF EXISTS "HR can update templates" ON public.job_templates;
CREATE POLICY "HR can update templates"
ON public.job_templates
FOR UPDATE
TO authenticated
USING (
  company_id = private.current_user_company()
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE users.user_id = auth.uid()
      AND users.role = ANY (ARRAY['owner','superadmin','hr'])
  )
);

DROP POLICY IF EXISTS "Staff can delete company offer templates" ON public.offer_templates;
CREATE POLICY "Staff can delete company offer templates"
ON public.offer_templates
FOR DELETE
TO authenticated
USING (company_id = private.current_user_company() AND private.is_company_staff());

DROP POLICY IF EXISTS "Staff can insert company offer templates" ON public.offer_templates;
CREATE POLICY "Staff can insert company offer templates"
ON public.offer_templates
FOR INSERT
TO authenticated
WITH CHECK (company_id = private.current_user_company() AND private.is_company_staff() AND created_by = auth.uid());

DROP POLICY IF EXISTS "Staff can update company offer templates" ON public.offer_templates;
CREATE POLICY "Staff can update company offer templates"
ON public.offer_templates
FOR UPDATE
TO authenticated
USING (company_id = private.current_user_company() AND private.is_company_staff())
WITH CHECK (company_id = private.current_user_company() AND private.is_company_staff());

DROP POLICY IF EXISTS "Staff can view company offer templates" ON public.offer_templates;
CREATE POLICY "Staff can view company offer templates"
ON public.offer_templates
FOR SELECT
TO authenticated
USING (company_id = private.current_user_company() AND private.is_company_staff());

DROP POLICY IF EXISTS "Company staff can view prep sessions" ON public.prep_sessions;
CREATE POLICY "Company staff can view prep sessions"
ON public.prep_sessions
FOR SELECT
TO authenticated
USING (private.is_candidate_for_my_company(candidate_id));

DROP POLICY IF EXISTS "Sender can insert own scheduled messages" ON public.scheduled_messages;
CREATE POLICY "Sender can insert own scheduled messages"
ON public.scheduled_messages
FOR INSERT
TO authenticated
WITH CHECK (sender_id = auth.uid() AND private.is_hr_or_admin());

DROP POLICY IF EXISTS "Staff can view company colleagues" ON public.users;
CREATE POLICY "Staff can view company colleagues"
ON public.users
FOR SELECT
TO authenticated
USING (private.is_company_staff() AND company_id IS NOT NULL AND company_id = private.current_user_company());

DROP POLICY IF EXISTS "Staff can view their candidates" ON public.users;
CREATE POLICY "Staff can view their candidates"
ON public.users
FOR SELECT
TO authenticated
USING (private.is_company_staff() AND role = 'candidate' AND private.is_candidate_for_my_company(id));

REVOKE EXECUTE ON FUNCTION public.current_user_company() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_company_staff() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_candidate_for_my_company(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_hr_or_admin() FROM authenticated;