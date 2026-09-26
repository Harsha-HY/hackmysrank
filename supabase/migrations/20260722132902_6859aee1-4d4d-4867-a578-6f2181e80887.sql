
REVOKE SELECT ON public.jobs FROM anon, authenticated;
GRANT SELECT (id, title, department, manager_id, salary_min, salary_max, location, work_type, experience_min, experience_max, skills_required, job_description, posted_by, company_id, status, applications_count, created_at, updated_at, aptitude_cutoff, embedding_source, embedded_at, resume_cutoff, pipeline_stages, pipeline_template_id) ON public.jobs TO anon, authenticated;
GRANT ALL ON public.jobs TO service_role;
