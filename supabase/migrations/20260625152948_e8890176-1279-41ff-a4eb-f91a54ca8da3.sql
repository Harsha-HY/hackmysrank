CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS embedding vector(3072),
  ADD COLUMN IF NOT EXISTS embedding_source text,
  ADD COLUMN IF NOT EXISTS embedded_at timestamptz;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS embedding vector(3072),
  ADD COLUMN IF NOT EXISTS embedding_source text,
  ADD COLUMN IF NOT EXISTS embedded_at timestamptz;

CREATE OR REPLACE FUNCTION public.match_jobs_for_candidate(
  query_embedding vector(3072),
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title text,
  company_id uuid,
  similarity float
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT j.id, j.title, j.company_id,
         1 - (j.embedding <=> query_embedding) AS similarity
  FROM public.jobs j
  WHERE j.embedding IS NOT NULL
    AND COALESCE(j.status, 'open') = 'open'
  ORDER BY j.embedding <=> query_embedding
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION public.match_candidates_for_job(
  query_embedding vector(3072),
  match_count int DEFAULT 25
)
RETURNS TABLE (
  candidate_user_id uuid,
  similarity float
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cp.user_id AS candidate_user_id,
         1 - (cp.embedding <=> query_embedding) AS similarity
  FROM public.candidate_profiles cp
  WHERE cp.embedding IS NOT NULL
    AND public.is_company_staff()
  ORDER BY cp.embedding <=> query_embedding
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_jobs_for_candidate(vector, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_candidates_for_job(vector, int) TO authenticated;