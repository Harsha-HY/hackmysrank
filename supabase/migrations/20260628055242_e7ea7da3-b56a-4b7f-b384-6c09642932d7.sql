DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'companies'
      AND policyname = 'Owners can view all companies'
  ) THEN
    CREATE POLICY "Owners can view all companies"
    ON public.companies
    FOR SELECT
    TO authenticated
    USING (
      owner_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.user_id = auth.uid()
          AND u.role = 'owner'
      )
    );
  END IF;
END $$;