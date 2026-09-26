// Parse aptitude PDF → MCQ JSON via Lovable AI Gateway (Gemini, native PDF input)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};


const MODEL = "gemini-3.6-flash";

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, Math.min(i + chunk, bytes.length))),
    );
  }
  return btoa(binary);
}

function extractJsonArray(text: string): any[] {
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  // Direct parse
  try {
    const v = JSON.parse(cleaned);
    if (Array.isArray(v)) return v;
    if (Array.isArray(v?.questions)) return v.questions;
  } catch (_) {
    // fall through
  }
  // First [...] block
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start !== -1 && end > start) {
    try {
      const v = JSON.parse(cleaned.substring(start, end + 1));
      if (Array.isArray(v)) return v;
    } catch (_) {
      /* noop */
    }
  }
  return [];
}

function normalizeQuestion(q: any, idx: number) {
  const letters = ["A", "B", "C", "D"];
  let answer = String(q.correct_answer ?? q.answer ?? "").trim().toUpperCase();
  if (!letters.includes(answer)) answer = "A";
  const cat = String(q.category ?? "General").trim();
  const diffRaw = String(q.difficulty ?? "Medium").trim().toLowerCase();
  const difficulty =
    diffRaw.startsWith("e") ? "Easy" : diffRaw.startsWith("h") ? "Hard" : "Medium";
  const time = Number(q.time_seconds ?? 60);
  return {
    question_number: Number(q.question_number ?? idx + 1),
    question: String(q.question ?? "").trim(),
    option_a: String(q.option_a ?? "").trim(),
    option_b: String(q.option_b ?? "").trim(),
    option_c: String(q.option_c ?? "").trim(),
    option_d: String(q.option_d ?? "").trim(),
    correct_answer: answer,
    category: cat,
    difficulty,
    time_seconds: Number.isFinite(time) ? time : 60,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file uploaded" }), {
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

    const base64 = arrayBufferToBase64(await file.arrayBuffer());
    const mime = file.type || "application/pdf";

    const prompt = `You are an expert question paper formatter.
I will give you raw text from a PDF.
Convert ALL questions in this text into proper MCQ format.

Rules:
- Every question must have exactly 4 options
- Label options as A, B, C, D
- Identify the correct answer for each
- If a question already has options keep them
- If a question has no options generate 4 plausible options with one correct
- Categorize each question as: Logical / Quantitative / English / Technical
- Set difficulty as Easy Medium or Hard
- Estimate time in seconds to answer

Return ONLY a valid JSON array:
[
  {
    "question_number": 1,
    "question": "question text here",
    "option_a": "first option",
    "option_b": "second option",
    "option_c": "third option",
    "option_d": "fourth option",
    "correct_answer": "A",
    "category": "Logical",
    "difficulty": "Medium",
    "time_seconds": 60
  }
]

Do not include any text outside the JSON.
Do not include markdown backticks.`;

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{
              text: "You convert PDFs of aptitude questions into a strict JSON MCQ array. Output JSON only.",
            }],
          },
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mime, data: base64 } },
              ],
            },
          ],
        }),
      },
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please retry shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({ error: `AI error: ${aiResponse.status}`, detail: errText.slice(0, 500) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiData = await aiResponse.json();
    const aiContent: string = (aiData?.candidates?.[0]?.content?.parts ?? [])
      .map((p: any) => p?.text)
      .filter(Boolean)
      .join("\n");


    const rawArr = extractJsonArray(aiContent);
    const questions = rawArr
      .map(normalizeQuestion)
      .filter(
        (q) =>
          q.question.length > 0 &&
          q.option_a.length > 0 &&
          q.option_b.length > 0 &&
          q.option_c.length > 0 &&
          q.option_d.length > 0,
      )
      .map((q, i) => ({ ...q, question_number: i + 1 }));

    if (questions.length === 0) {
      console.error("No questions parsed. AI content:", aiContent.slice(0, 800));
      return new Response(
        JSON.stringify({
          error:
            "Could not extract MCQs from this PDF. Try a clearer PDF with selectable text or numbered questions.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ success: true, questions }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("parse-pdf-questions error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
