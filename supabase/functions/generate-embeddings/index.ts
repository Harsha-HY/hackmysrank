// Generates embeddings for a candidate profile or a job and stores them.
// Usage:
//   POST { kind: "candidate", id: "<users.id>" }
//   POST { kind: "job", id: "<jobs.id>" }
//   POST { kind: "query", text: "..." }  -> returns { embedding }
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

async function embed(text: string): Promise<number[]> {
  const r = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GEMINI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gemini-embedding-001",
      input: text.slice(0, 30000),
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Embedding gateway ${r.status}: ${t}`);
  }
  const j = await r.json();
  return j.data?.[0]?.embedding as number[];
}

function profileText(p: any): string {
  const parts: string[] = [];
  if (p.headline) parts.push(`Headline: ${p.headline}`);
  if (p.about_me) parts.push(`About: ${p.about_me}`);
  if (Array.isArray(p.skills) && p.skills.length) parts.push(`Skills: ${p.skills.join(", ")}`);
  if (p.location) parts.push(`Location: ${p.location}`);
  if (Array.isArray(p.work_types) && p.work_types.length) parts.push(`Work types: ${p.work_types.join(", ")}`);
  const exps = Array.isArray(p.experiences) ? p.experiences : [];
  if (exps.length) {
    parts.push("Experience:");
    for (const e of exps) {
      parts.push(`- ${e.title ?? ""} at ${e.company ?? ""} (${e.start ?? ""}–${e.end ?? "present"}): ${e.description ?? ""}`);
    }
  }
  const projs = Array.isArray(p.projects) ? p.projects : [];
  if (projs.length) {
    parts.push("Projects:");
    for (const pr of projs) parts.push(`- ${pr.name ?? ""}: ${pr.description ?? ""} ${(pr.tech || []).join(", ")}`);
  }
  const edus = Array.isArray(p.education) ? p.education : [];
  if (edus.length) {
    parts.push("Education:");
    for (const e of edus) parts.push(`- ${e.degree ?? ""} at ${e.school ?? ""} (${e.year ?? ""})`);
  }
  return parts.join("\n");
}

function jobText(j: any): string {
  const parts: string[] = [];
  if (j.title) parts.push(`Title: ${j.title}`);
  if (j.department) parts.push(`Department: ${j.department}`);
  if (j.location) parts.push(`Location: ${j.location}`);
  if (j.employment_type) parts.push(`Type: ${j.employment_type}`);
  if (j.experience_range) parts.push(`Experience: ${j.experience_range}`);
  if (Array.isArray(j.skills) && j.skills.length) parts.push(`Skills: ${j.skills.join(", ")}`);
  if (j.description) parts.push(`Description: ${j.description}`);
  if (j.requirements) parts.push(`Requirements: ${j.requirements}`);
  return parts.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const _authHeader = req.headers.get("Authorization") || "";
    if (!_authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const _userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: _authHeader } } });
    const { data: { user: _u } } = await _userClient.auth.getUser();
    if (!_u) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: _caller } = await _userClient.from("users").select("id, role, company_id").eq("user_id", _u.id).maybeSingle();
    if (!_caller) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const { kind, id, text } = body ?? {};

    if (kind === "query") {
      if (!text) return new Response(JSON.stringify({ error: "text required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const embedding = await embed(text);
      return new Response(JSON.stringify({ embedding }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const STAFF = ["hr", "manager", "owner", "superadmin"];

    if (kind === "candidate") {
      // `id` is the candidate's auth user id (candidate_profiles.user_id).
      // Candidates may only refresh their own embedding; staff may refresh it for
      // candidates who applied to a job at their company.
      let allowed = _u.id === id;
      if (!allowed && STAFF.includes(_caller.role)) {
        const { data: targetUser } = await admin
          .from("users")
          .select("id")
          .eq("user_id", id)
          .maybeSingle();
        if (targetUser) {
          const { data: appRow } = await admin
            .from("applications")
            .select("id, jobs!inner(company_id)")
            .eq("candidate_id", targetUser.id)
            .eq("jobs.company_id", _caller.company_id)
            .limit(1)
            .maybeSingle();
          allowed = !!appRow;
        }
      }
      if (!allowed) {
        return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: p, error } = await admin.from("candidate_profiles").select("*").eq("user_id", id).maybeSingle();
      if (error || !p) throw new Error(error?.message ?? "profile not found");
      const source = profileText(p);
      if (!source.trim()) return new Response(JSON.stringify({ skipped: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const embedding = await embed(source);
      const { error: e2 } = await admin.from("candidate_profiles").update({
        embedding: embedding as any,
        embedding_source: source,
        embedded_at: new Date().toISOString(),
      }).eq("user_id", id);
      if (e2) throw new Error(e2.message);
      return new Response(JSON.stringify({ ok: true, chars: source.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (kind === "job") {
      // Only staff of the owning company (or the platform owner) may embed a job.
      const { data: jobRow } = await admin.from("jobs").select("company_id").eq("id", id).maybeSingle();
      if (!jobRow) {
        return new Response(JSON.stringify({ error: "job not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const jobAllowed = _caller.role === "owner"
        || (STAFF.includes(_caller.role) && jobRow.company_id === _caller.company_id);
      if (!jobAllowed) {
        return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: j, error } = await admin.from("jobs").select("*").eq("id", id).maybeSingle();
      if (error || !j) throw new Error(error?.message ?? "job not found");
      const source = jobText(j);
      if (!source.trim()) return new Response(JSON.stringify({ skipped: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const embedding = await embed(source);
      const { error: e2 } = await admin.from("jobs").update({
        embedding: embedding as any,
        embedding_source: source,
        embedded_at: new Date().toISOString(),
      }).eq("id", id);
      if (e2) throw new Error(e2.message);
      return new Response(JSON.stringify({ ok: true, chars: source.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "unknown kind" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
