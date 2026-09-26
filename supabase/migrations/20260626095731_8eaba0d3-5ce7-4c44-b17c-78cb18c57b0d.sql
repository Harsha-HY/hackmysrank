
-- 1) Fix Security Definer View: set companies_public to security_invoker
ALTER VIEW public.companies_public SET (security_invoker = on);

-- 2) Lock down companies table public read: drop the blanket public policy and
--    expose only safe columns through existing public views.
DROP POLICY IF EXISTS "Public can read company profile fields" ON public.companies;

-- Revoke any anon SELECT on the table itself (members still read via dedicated policy)
REVOKE SELECT ON public.companies FROM anon;

-- Ensure the public-facing views are readable by anon/authenticated
GRANT SELECT ON public.company_public_profiles TO anon, authenticated;
GRANT SELECT ON public.companies_public TO anon, authenticated;

-- 3) Tighten SECURITY DEFINER helper functions: only authenticated may EXECUTE.
REVOKE EXECUTE ON FUNCTION public.get_job_aptitude_questions(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_job_aptitude_cutoff(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_user_company() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_company_staff() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_hr_or_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_candidate_for_my_company(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.match_candidates_for_job(vector, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.match_jobs_for_candidate(vector, integer) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_job_aptitude_questions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_job_aptitude_cutoff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_company() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_hr_or_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_candidate_for_my_company(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_candidates_for_job(vector, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_jobs_for_candidate(vector, integer) TO authenticated;
