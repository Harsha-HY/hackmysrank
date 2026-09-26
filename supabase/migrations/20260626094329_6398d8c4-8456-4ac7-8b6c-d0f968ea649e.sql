
CREATE TABLE IF NOT EXISTS public.offer_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  created_by uuid NOT NULL,
  template_name text NOT NULL,
  template_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  logo_url text,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.offer_templates TO authenticated;
GRANT ALL ON public.offer_templates TO service_role;

ALTER TABLE public.offer_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view company offer templates"
ON public.offer_templates FOR SELECT TO authenticated
USING (company_id = public.current_user_company() AND public.is_company_staff());

CREATE POLICY "Staff can insert company offer templates"
ON public.offer_templates FOR INSERT TO authenticated
WITH CHECK (company_id = public.current_user_company() AND public.is_company_staff() AND created_by = auth.uid());

CREATE POLICY "Staff can update company offer templates"
ON public.offer_templates FOR UPDATE TO authenticated
USING (company_id = public.current_user_company() AND public.is_company_staff())
WITH CHECK (company_id = public.current_user_company() AND public.is_company_staff());

CREATE POLICY "Staff can delete company offer templates"
ON public.offer_templates FOR DELETE TO authenticated
USING (company_id = public.current_user_company() AND public.is_company_staff());

CREATE TRIGGER update_offer_templates_updated_at
BEFORE UPDATE ON public.offer_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS offer_templates_company_idx ON public.offer_templates(company_id);
