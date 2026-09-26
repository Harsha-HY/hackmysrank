// Columns of public.jobs that anon/authenticated roles are allowed to SELECT.
// Sensitive columns (aptitude_questions, embedding, ...) are intentionally excluded —
// using `select("*")` on jobs fails with a permission error because of them.
export const JOB_COLUMNS =
  "id, title, job_description, department, location, work_type, employment_type, status, skills_required, experience_min, experience_max, salary_min, salary_max, resume_cutoff, aptitude_cutoff, applications_count, company_id, manager_id, posted_by, pipeline_stages, pipeline_template_id, created_at, updated_at" as const;
