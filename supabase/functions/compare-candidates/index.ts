import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const _authHeader = req.headers.get("Authorization") || "";
    if (!_authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const _userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: _authHeader } } });
    const { data: { user: _u } } = await _userClient.auth.getUser();
    if (!_u) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: _caller } = await _userClient.from("users").select("role").eq("user_id", _u.id).maybeSingle();
    if (!_caller || !["hr","manager","owner","superadmin"].includes(_caller.role)) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { candidates, job } = await req.json();
    if (!Array.isArray(candidates) || candidates.length < 2) {
      return new Response(JSON.stringify({ error: "Need at least 2 candidates" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const candidateBlocks = candidates
      .map(
        (c: any, i: number) =>
          `Candidate ${i + 1}: ${c.name}
  - Overall: ${c.overall ?? "N/A"}
  - Resume: ${c.resume_score ?? "N/A"}
  - Aptitude: ${c.aptitude_score ?? "N/A"}
  - Video: ${c.video_score ?? "N/A"}
  - Technical: ${c.technical_score ?? "N/A"}
  - GD: ${c.gd_score ?? "N/A"}
  - Experience: ${c.experience ?? "N/A"} yrs
  - Current CTC: ${c.current_ctc ?? "N/A"}, Expected: ${c.expected_ctc ?? "N/A"}
  - Notice period: ${c.notice_period ?? "N/A"} days
  - Skills matched: ${(c.matched_skills || []).join(", ") || "none"}
  - Missing skills: ${(c.missing_skills || []).join(", ") || "none"}
  - Violations: ${c.violations ?? 0}`
      )
      .join("\n\n");

    const prompt = `Compare these candidates for the role "${job?.title || "the position"}" and recommend who to proceed with.

${candidateBlocks}

Job Requirements: ${JSON.stringify(job || {})}

Return ONLY valid JSON with this exact shape (no markdown, no prose):
{
  "recommended": "Candidate Name",
  "reason": "2-3 sentence explanation",
  "rank_order": ["First name", "Second name", "Third name"],
  "proceed_with": ["name1", "name2"]
}`;

    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-3.6-flash",
        messages: [
          { role: "system", content: "You are an expert recruitment analyst. Respond ONLY with valid JSON." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      return new Response(JSON.stringify({ error: `AI gateway: ${res.status} ${txt}` }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { recommended: "", reason: content, rank_order: [], proceed_with: [] };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
