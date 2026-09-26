
-- Public read for company-assets (logos/banners/office photos on public profile)
DROP POLICY IF EXISTS "company_assets_public_read" ON storage.objects;
CREATE POLICY "company_assets_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'company-assets');

-- Admin write: only owner/superadmin whose company_id matches the first path segment
DROP POLICY IF EXISTS "company_assets_admin_write" ON storage.objects;
CREATE POLICY "company_assets_admin_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'company-assets'
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.user_id = auth.uid()
        AND u.role IN ('owner','superadmin')
        AND u.company_id::text = split_part(name, '/', 1)
    )
  );

DROP POLICY IF EXISTS "company_assets_admin_update" ON storage.objects;
CREATE POLICY "company_assets_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.user_id = auth.uid()
        AND u.role IN ('owner','superadmin')
        AND u.company_id::text = split_part(name, '/', 1)
    )
  );

DROP POLICY IF EXISTS "company_assets_admin_delete" ON storage.objects;
CREATE POLICY "company_assets_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.user_id = auth.uid()
        AND u.role IN ('owner','superadmin')
        AND u.company_id::text = split_part(name, '/', 1)
    )
  );
