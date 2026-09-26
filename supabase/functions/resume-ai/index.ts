import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function callGemini(prompt: string): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gemini-3.6-flash",
      messages: [
        { role: "system", content: "You are a senior resume writing coach. Be concise, action-driven, and impact focused. Never use first person or the word 'I'." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`AI gateway ${res.status}: ${txt.slice(0, 200)}`);
  }
  const json = await res.json();
  return json?.choices?.[0]?.message?.content?.trim() || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const action = body?.action as string;

    let prompt = "";
    if (action === "summary") {
      const { name, headline, skills, experiences } = body;
      prompt = `Write a professional resume summary for this person:
Name: ${name || ""}
Headline: ${headline || ""}
Skills: ${Array.isArray(skills) ? skills.join(", ") : ""}
Experience: ${Array.isArray(experiences) ? experiences.map((e: any) => `${e.title || ""} at ${e.company || ""}`).join("; ") : ""}

Make it exactly 3 sentences. Professional tone. No first person. No "I" statements. Return only the summary text — no preamble, no quotes.`;
    } else if (action === "improve_bullets") {
      const { description } = body;
      prompt = `Rewrite these job responsibilities as strong resume bullet points.
Use strong action verbs. Include measurable impact where possible. Each bullet under 15 words.
Raw input:
${description || ""}

Return as a numbered list (1., 2., 3., ...) only. No intro text, no explanation.`;
    } else if (action === "suggest_skills") {
      const { experiences, headline } = body;
      prompt = `Suggest 8 relevant technical skills for someone with this background.
Headline: ${headline || ""}
Experience: ${Array.isArray(experiences) ? experiences.map((e: any) => `${e.title || ""}: ${e.description || ""}`).join(" | ") : ""}

Return as a comma-separated list only. No numbering, no preamble.`;
    } else {
      return new Response(JSON.stringify({ error: "invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await callGemini(prompt);
    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
