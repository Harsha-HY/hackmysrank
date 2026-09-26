
-- 1. Sanitizer: recursively strip answer-key fields from question JSON
CREATE OR REPLACE FUNCTION public.strip_answer_keys(j jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  k text;
  v jsonb;
  out_obj jsonb;
  out_arr jsonb;
  elem jsonb;
  secret_keys text[] := ARRAY[
    'correct_answer','correct_option','correct','answer','answer_key',
    'expected_approach','expected_output','solution','solutions',
    'test_cases','testcases','hidden_tests','explanation','rubric','marking_scheme'
  ];
BEGIN
  IF j IS NULL THEN RETURN NULL; END IF;

  IF jsonb_typeof(j) = 'object' THEN
    out_obj := '{}'::jsonb;
    FOR k, v IN SELECT * FROM jsonb_each(j) LOOP
      IF NOT (lower(k) = ANY (secret_keys)) THEN
        out_obj := out_obj || jsonb_build_object(k, public.strip_answer_keys(v));
      END IF;
    END LOOP;
    RETURN out_obj;
  ELSIF jsonb_typeof(j) = 'array' THEN
    out_arr := '[]'::jsonb;
    FOR elem IN SELECT * FROM jsonb_array_elements(j) LOOP
      out_arr := out_arr || jsonb_build_array(public.strip_answer_keys(elem));
    END LOOP;
    RETURN out_arr;
  ELSE
    RETURN j;
  END IF;
END;
$$;

-- 2. Candidate-facing sanitized assessment accessor
CREATE OR REPLACE FUNCTION public.get_candidate_assessment(_application_id uuid, _type text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
BEGIN
  SELECT a.id, a.type, a.status, a.job_id, a.questions
    INTO rec
  FROM public.assessments a
  JOIN public.applications app ON app.id = a.application_id
  JOIN public.users u ON u.id = app.candidate_id
  WHERE a.application_id = _application_id
    AND a.status = 'approved'
    AND (_type IS NULL OR a.type = _type)
    AND u.user_id = auth.uid()
  ORDER BY a.created_at DESC
  LIMIT 1;

  IF rec IS NULL THEN RETURN NULL; END IF;

  RETURN jsonb_build_object(
    'id', rec.id,
    'type', rec.type,
    'status', rec.status,
    'job_id', rec.job_id,
    'questions', public.strip_answer_keys(rec.questions)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_candidate_assessment(uuid, text) TO authenticated;

-- 3. Remove direct candidate read access to raw assessments (answer keys)
DROP POLICY IF EXISTS "Candidates can read approved assessments" ON public.assessments;

-- 4. Companies: hide company_code from everyone (owners use owner_company_codes RPC)
--    and hide owner_id from anonymous visitors, via column-level grants.
REVOKE SELECT ON public.companies FROM anon, authenticated;

GRANT SELECT (
  id, company_name, industry, location, status, slug, tagline, logo_url, banner_url,
  about, website, company_size, founded_year, office_photos, tech_stack, benefits,
  avg_response_days, created_at, updated_at
) ON public.companies TO anon;

GRANT SELECT (
  id, company_name, industry, location, status, plan, owner_id, slug, tagline, logo_url,
  banner_url, about, website, company_size, founded_year, office_photos, tech_stack,
  benefits, avg_response_days, created_at, updated_at
) ON public.companies TO authenticated;
