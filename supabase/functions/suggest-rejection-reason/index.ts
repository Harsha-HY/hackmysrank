import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

const errJson = (message: string, status: number) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    // Staff-only: this endpoint spends AI credits.
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return errJson("unauthorized", 401);
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return errJson("unauthorized", 401);
    const { data: caller } = await userClient.from("users").select("id, role").eq("user_id", user.id).maybeSingle();
    if (!caller || !["hr", "manager", "owner", "superadmin"].includes(caller.role)) {
      return errJson("forbidden", 403);
    }

    const body = await req.json();
    const {
      candidateName = "the candidate",
      jobTitle = "the role",
      stage = "current stage",
      resumeScore,
      aptitudeScore,
      videoScore,
      technicalScore,
      gdScore,
      interviewScore,
      notes = "",
      matchedSkills = [],
      missingSkills = [],
    } = body || {};

    const prompt = `You are an HR assistant. Write a concise, kind but honest rejection reason (2-3 sentences, max 60 words) explaining why ${candidateName} is being rejected at the "${stage}" stage for the role "${jobTitle}".

Base your reason on these signals (only mention what's relevant):
- Resume score: ${resumeScore ?? "n/a"}/100
- Aptitude score: ${aptitudeScore ?? "n/a"}/100
- Video score: ${videoScore ?? "n/a"}/100
- Technical score: ${technicalScore ?? "n/a"}/100
- GD score: ${gdScore ?? "n/a"}/100
- Interview score: ${interviewScore ?? "n/a"}/100
- Matched skills: ${(matchedSkills || []).slice(0, 8).join(", ") || "none"}
- Missing skills: ${(missingSkills || []).slice(0, 8).join(", ") || "none"}
- HR notes: ${notes || "none"}

Return ONLY the rejection reason text — no preface, no salutation, no sign-off.`;

    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GEMINI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gemini-3.6-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      console.error("AI error", res.status, t);
      if (res.status === 429) throw new Error("Rate limited by AI gateway, try again shortly.");
      if (res.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`AI gateway ${res.status}: ${t}`);
    }
    const data = await res.json();
    const reason = data?.choices?.[0]?.message?.content?.trim() || "";
    return new Response(JSON.stringify({ reason }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
