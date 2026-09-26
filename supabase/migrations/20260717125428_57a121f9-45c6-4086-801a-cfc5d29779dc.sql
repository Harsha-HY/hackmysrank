
-- 1) Templates table
CREATE TABLE public.interview_process_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_process_templates TO authenticated;
GRANT ALL ON public.interview_process_templates TO service_role;

ALTER TABLE public.interview_process_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company staff read templates"
ON public.interview_process_templates FOR SELECT
TO authenticated
USING (company_id = public.current_user_company() AND public.is_hr_or_admin());

CREATE POLICY "Company staff insert templates"
ON public.interview_process_templates FOR INSERT
TO authenticated
WITH CHECK (company_id = public.current_user_company() AND public.is_hr_or_admin());

CREATE POLICY "Company staff update templates"
ON public.interview_process_templates FOR UPDATE
TO authenticated
USING (company_id = public.current_user_company() AND public.is_hr_or_admin())
WITH CHECK (company_id = public.current_user_company() AND public.is_hr_or_admin());

CREATE POLICY "Company staff delete templates"
ON public.interview_process_templates FOR DELETE
TO authenticated
USING (company_id = public.current_user_company() AND public.is_hr_or_admin());

CREATE TRIGGER trg_interview_templates_updated_at
BEFORE UPDATE ON public.interview_process_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Only one default per company
CREATE UNIQUE INDEX interview_templates_one_default
ON public.interview_process_templates(company_id)
WHERE is_default = true;

-- 2) jobs pipeline columns
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS pipeline_stages JSONB,
  ADD COLUMN IF NOT EXISTS pipeline_template_id UUID REFERENCES public.interview_process_templates(id) ON DELETE SET NULL;
