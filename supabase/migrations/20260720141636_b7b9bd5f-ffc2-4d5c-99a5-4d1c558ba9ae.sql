-- Interview template policies reference public.current_user_company() and public.is_hr_or_admin(),
-- which had EXECUTE revoked from authenticated in an earlier hardening migration.
-- Restore EXECUTE so the policies (used by templates and jobs) actually work.
GRANT EXECUTE ON FUNCTION public.current_user_company() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_hr_or_admin() TO authenticated;