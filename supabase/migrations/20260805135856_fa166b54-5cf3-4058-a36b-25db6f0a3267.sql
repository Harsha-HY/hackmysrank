-- Consolidate job write policies so all company staff (and platform owners) can manage jobs.
DROP POLICY IF EXISTS "HR can insert jobs" ON public.jobs;
DROP POLICY IF EXISTS "Manager can insert jobs" ON public.jobs;
DROP POLICY IF EXISTS "HR can update company jobs" ON public.jobs;
DROP POLICY IF EXISTS "Manager can update company jobs" ON public.jobs;
DROP POLICY IF EXISTS "Company staff can delete company jobs" ON public.jobs;

CREATE POLICY "Staff can insert company jobs"
ON public.jobs FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.user_id = auth.uid()
      AND u.role = ANY (ARRAY['owner','superadmin','hr','manager'])
      AND (u.company_id = jobs.company_id OR u.role = 'owner')
  )
);

CREATE POLICY "Staff can update company jobs"
ON public.jobs FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.user_id = auth.uid()
      AND u.role = ANY (ARRAY['owner','superadmin','hr','manager'])
      AND (u.company_id = jobs.company_id OR u.role = 'owner')
  )
);

CREATE POLICY "Staff can delete company jobs"
ON public.jobs FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.user_id = auth.uid()
      AND u.role = ANY (ARRAY['owner','superadmin','hr','manager'])
      AND (u.company_id = jobs.company_id OR u.role = 'owner')
  )
);

-- Platform owners also need to see every job to manage them.
DROP POLICY IF EXISTS "Owners can view all jobs" ON public.jobs;
CREATE POLICY "Owners can view all jobs"
ON public.jobs FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.user_id = auth.uid() AND u.role = 'owner')
);
