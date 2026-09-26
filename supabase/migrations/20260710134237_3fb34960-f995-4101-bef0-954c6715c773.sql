CREATE OR REPLACE FUNCTION public.get_job_aptitude_questions(_job_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT j.aptitude_questions
  FROM public.jobs j
  JOIN public.users u ON u.company_id = j.company_id
  WHERE j.id = _job_id
    AND u.user_id = auth.uid()
    AND u.role = ANY (ARRAY['owner','superadmin','hr','manager']);
$$;

CREATE OR REPLACE FUNCTION public.match_candidates_for_job(query_embedding vector, match_count integer DEFAULT 25)
RETURNS TABLE(candidate_user_id uuid, similarity double precision)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT cp.user_id AS candidate_user_id,
         1 - (cp.embedding <=> query_embedding) AS similarity
  FROM public.candidate_profiles cp
  WHERE cp.embedding IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.user_id = auth.uid()
        AND u.role = ANY (ARRAY['owner','superadmin','hr','manager'])
    )
  ORDER BY cp.embedding <=> query_embedding
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.get_job_aptitude_questions(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.match_candidates_for_job(vector, integer) TO authenticated, service_role;