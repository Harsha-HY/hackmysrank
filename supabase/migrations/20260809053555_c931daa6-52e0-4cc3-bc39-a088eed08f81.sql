GRANT EXECUTE ON FUNCTION public.is_candidate_for_my_company(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_job_aptitude_cutoff(uuid) TO authenticated;