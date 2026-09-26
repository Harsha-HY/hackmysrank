GRANT EXECUTE ON FUNCTION public.current_user_company() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_candidate_for_my_company(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_company() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_company_staff() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_candidate_for_my_company(uuid) TO service_role;