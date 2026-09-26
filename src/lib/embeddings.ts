import { supabase } from "@/integrations/supabase/client";

/** Fire-and-forget embedding refresh. Safe to call after profile/job mutations. */
export async function refreshEmbedding(kind: "candidate" | "job", id: string) {
  try {
    await supabase.functions.invoke("generate-embeddings", { body: { kind, id } });
  } catch (err) {
    console.warn("[embeddings] refresh failed", err);
  }
}

/** Embed an arbitrary query string via the edge function. */
export async function embedQuery(text: string): Promise<number[] | null> {
  try {
    const { data, error } = await supabase.functions.invoke("generate-embeddings", {
      body: { kind: "query", text },
    });
    if (error) throw error;
    return (data as any)?.embedding ?? null;
  } catch (err) {
    console.warn("[embeddings] query failed", err);
    return null;
  }
}

/** Semantic job recommendations for a candidate based on their profile text. */
export async function matchJobsForText(text: string, limit = 10) {
  const embedding = await embedQuery(text);
  if (!embedding) return [];
  const { data, error } = await supabase.rpc("match_jobs_for_candidate", {
    query_embedding: embedding as any,
    match_count: limit,
  });
  if (error) {
    console.warn("[embeddings] match_jobs_for_candidate failed", error);
    return [];
  }
  return data ?? [];
}

/** Semantic candidate matches for a job (staff only by RLS). */
export async function matchCandidatesForText(text: string, limit = 25) {
  const embedding = await embedQuery(text);
  if (!embedding) return [];
  const { data, error } = await supabase.rpc("match_candidates_for_job", {
    query_embedding: embedding as any,
    match_count: limit,
  });
  if (error) {
    console.warn("[embeddings] match_candidates_for_job failed", error);
    return [];
  }
  return data ?? [];
}
