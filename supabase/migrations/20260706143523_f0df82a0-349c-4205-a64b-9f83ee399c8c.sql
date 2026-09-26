
-- Lock down SECURITY DEFINER helper functions: they should only be used
-- internally by RLS policies (which run as postgres) or by specific roles.
-- Revoke public/anon EXECUTE on all, and revoke authenticated EXECUTE
-- on internal-only helpers.

REVOKE EXECUTE ON FUNCTION public.current_user_company() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_company_staff() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_hr_or_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_candidate_for_my_company(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_job_aptitude_cutoff(uuid) FROM PUBLIC, anon, authenticated;

-- Called from client via supabase.rpc — keep authenticated, drop anon/public
REVOKE EXECUTE ON FUNCTION public.get_job_aptitude_questions(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.match_jobs_for_candidate(vector, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.match_candidates_for_job(vector, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_job_aptitude_questions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_jobs_for_candidate(vector, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_candidates_for_job(vector, integer) TO authenticated;
