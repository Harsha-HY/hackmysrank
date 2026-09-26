REVOKE ALL ON FUNCTION private.current_user_company() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_company_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_hr_or_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_candidate_for_my_company(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.current_user_company() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_company_staff() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_hr_or_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_candidate_for_my_company(uuid) TO authenticated, service_role;