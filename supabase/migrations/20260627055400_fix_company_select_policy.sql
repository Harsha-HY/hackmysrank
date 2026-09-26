-- Fix companies SELECT policy to allow owners and platform owners to read the company
DROP POLICY IF EXISTS "companies_owner_select" ON public.companies;
CREATE POLICY "companies_owner_select"
ON public.companies FOR SELECT TO authenticated
USING (
  owner_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.user_id = auth.uid() AND users.role = 'owner'
  )
);

-- Grant INSERT permission on public.companies to authenticated users
GRANT INSERT ON public.companies TO authenticated;
