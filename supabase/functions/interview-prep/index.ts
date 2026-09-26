import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const MODEL = "gemini-3.6-flash";

function extractJson(text: string): any {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const s = cleaned.indexOf("{"); const e = cleaned.lastIndexOf("}");
    if (s >= 0 && e > s) return JSON.parse(cleaned.slice(s, e + 1));
    throw new Error("AI response was not valid JSON");
  }
}

const STAGE_PROMPTS: Record<string, string> = {
  technical_round: `Generate 10 INTERVIEW-GRADE technical questions for a real tech interview. Difficulty must lean MEDIUM and HARD (no trivial definitions, no "what is a variable" style). Include realistic constraints, example inputs/outputs, edge cases, and follow-up probes. When a coding language is given, write code snippets, signatures, and examples in that exact language. When the topic is DSA, give problem statements with constraints + sample I/O + expected complexity. When the topic is System Design, give scoped design problems (scale numbers, SLAs, components to discuss). When the topic is a cloud/devops/framework topic, give scenario-based questions (debug this, design this, optimise this) — not textbook definitions.`,
  hr_interview: `Generate 10 questions for an HR Interview: 4 behavioral, 3 situational, 2 motivation, 1 salary/notice period question.`,
  video_intro: `Generate 10 prompts for a Video Introduction: 5 self introduction prompts, 3 experience focused prompts, 2 role fit questions.`,
  group_discussion: `Generate 10 items for a Group Discussion: 5 likely discussion topics, 3 opening statement prompts, 2 counter-argument practice prompts.`,
  aptitude_test: `Generate 10 REAL aptitude exam questions (CAT/placement difficulty). Mix according to the chosen topic. Each question must be solvable in 60-120 seconds, include the full problem text with numbers/data, and the "tip" field must contain the worked-out approach (not a vague hint). Avoid trivia.`,
};

const STAGE_LABEL: Record<string, string> = {
  technical_round: "Technical Round",
  hr_interview: "HR Interview",
  video_intro: "Video Introduction",
  group_discussion: "Group Discussion",
  aptitude_test: "Aptitude Test",
};

async function callAI(apiKey: string, system: string, user: string) {
  const r = await fetch(AI_GATEWAY_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`AI gateway ${r.status}: ${t}`);
  }
  const j = await r.json();
  return j?.choices?.[0]?.message?.content ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const action = body.action as "generate" | "rate";
    const stage = String(body.stage || "");

    if (action === "generate") {
      const { jobTitle, skills, candidateSummary, topic, language, difficulty } = body;
      const stageInstructions = STAGE_PROMPTS[stage] || `Generate 10 likely interview questions for ${STAGE_LABEL[stage] || stage}.`;
      const system = `You are a senior interview coach who writes REAL interview questions used by top companies (FAANG, top product startups). Never produce textbook/trivia questions. Always return valid JSON only. Use markdown inside the "question" field when helpful (code fences, lists, tables).`;
      const user = `${stageInstructions}

Job Title: ${jobTitle || "N/A"}
Required Skills: ${Array.isArray(skills) ? skills.join(", ") : skills || "N/A"}
Candidate Profile Summary: ${candidateSummary || "N/A"}
Stage: ${STAGE_LABEL[stage] || stage}
Practice Topic: ${topic || "General"}
${language ? `Preferred Coding Language: ${language} (write all code in this language)` : ""}
Target Difficulty: ${difficulty || "Medium to Hard"}

Rules:
- All 10 questions MUST be on the chosen topic above (do not drift).
- For DSA: include constraints, sample input/output, and expected time/space complexity.
- For System Design: include scale (QPS, users, data size) and required components.
- For Coding (language-specific): include a function signature and 1-2 test cases in that language inside a fenced code block.
- For Cloud/AWS/Cloudflare/DevOps: scenario-based ("Your service has X traffic and Y failure, design/fix it").
- For Aptitude: include actual numbers/data; tip must show step-by-step solution.
- No "What is X?" definition questions. No one-liner trivia.

Return JSON exactly:
{
  "questions": [
    { "number": 1, "question": "...", "category": "DSA|System Design|Coding|Cloud|DevOps|Frontend|Backend|Database|Behavioral|Situational|Concept|Motivation|Introduction|Topic|Logical|Quantitative|Verbal|DI", "difficulty": "Easy|Medium|Hard", "tip": "concrete approach / worked solution outline" }
  ]
}`;
      const raw = await callAI(apiKey, system, user);
      const parsed = extractJson(raw);
      const questions = Array.isArray(parsed?.questions) ? parsed.questions.slice(0, 10) : [];
      return new Response(JSON.stringify({ questions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "rate") {
      const { question, answer, jobTitle } = body;
      const system = `You are an expert interview evaluator. Always return valid JSON only.`;
      const user = `Rate this interview answer out of 10.
Question: ${question}
Answer: ${answer}
Stage: ${STAGE_LABEL[stage] || stage}
Job Role: ${jobTitle || "N/A"}

Return JSON exactly:
{
  "score": 0,
  "strengths": ["..."],
  "improvements": ["..."],
  "better_version": "...",
  "verdict": "Strong|Average|Needs Work"
}`;
      const raw = await callAI(apiKey, system, user);
      const parsed = extractJson(raw);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
