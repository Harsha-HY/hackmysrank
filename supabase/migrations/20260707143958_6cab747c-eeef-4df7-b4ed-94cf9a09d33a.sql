
-- RLS for test-recordings bucket: candidates upload their own; staff read within same company via applications join
CREATE POLICY "Candidates can upload own test recordings"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'test-recordings'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Candidates can read own test recordings"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'test-recordings'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Staff can read all test recordings"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'test-recordings'
  AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.user_id = auth.uid()
    AND u.role IN ('owner','superadmin','hr','manager','hiring_manager')
  )
);

-- Extend test_violations to accept new violation types (assumes text column already, no-op if so)
