CREATE TABLE public.job_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  template_name TEXT NOT NULL,
  job_title TEXT,
  department TEXT,
  skills_required TEXT[] DEFAULT '{}',
  salary_min NUMERIC,
  salary_max NUMERIC,
  experience_min NUMERIC,
  experience_max NUMERIC,
  location TEXT,
  work_type TEXT,
  job_description TEXT,
  aptitude_cutoff_score INTEGER DEFAULT 60,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_templates TO authenticated;
GRANT ALL ON public.job_templates TO service_role;

ALTER TABLE public.job_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company staff can view templates"
ON public.job_templates FOR SELECT TO authenticated
USING (company_id = public.current_user_company() AND public.is_company_staff());

CREATE POLICY "HR can insert templates"
ON public.job_templates FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.current_user_company()
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE user_id = auth.uid()
      AND role = ANY (ARRAY['owner','superadmin','hr'])
  )
);

CREATE POLICY "HR can update templates"
ON public.job_templates FOR UPDATE TO authenticated
USING (
  company_id = public.current_user_company()
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE user_id = auth.uid()
      AND role = ANY (ARRAY['owner','superadmin','hr'])
  )
);

CREATE POLICY "HR can delete templates"
ON public.job_templates FOR DELETE TO authenticated
USING (
  company_id = public.current_user_company()
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE user_id = auth.uid()
      AND role = ANY (ARRAY['owner','superadmin','hr'])
  )
);

CREATE TRIGGER update_job_templates_updated_at
BEFORE UPDATE ON public.job_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_job_templates_company ON public.job_templates(company_id);