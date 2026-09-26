
CREATE TABLE public.prep_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL,
  application_id uuid NOT NULL,
  stage text NOT NULL,
  questions_answered integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 10,
  average_score numeric(4,2) NOT NULL DEFAULT 0,
  last_practiced timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, stage)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prep_sessions TO authenticated;
GRANT ALL ON public.prep_sessions TO service_role;

ALTER TABLE public.prep_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates manage own prep sessions"
ON public.prep_sessions FOR ALL
USING (candidate_id = auth.uid())
WITH CHECK (candidate_id = auth.uid());

CREATE POLICY "Company staff can view prep sessions"
ON public.prep_sessions FOR SELECT
USING (public.is_candidate_for_my_company(candidate_id));

CREATE TRIGGER update_prep_sessions_updated_at
BEFORE UPDATE ON public.prep_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
