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
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("AI response was not valid JSON");
  }
}

function normalizeDsa(p: any, idx: number) {
  const testCases = Array.isArray(p?.test_cases)
    ? p.test_cases.map((tc: any) =>
        typeof tc === "string"
          ? tc
          : `${tc?.input ?? ""} -> ${tc?.output ?? tc?.expected ?? ""}`,
      )
    : [];
  return {
    problem_number: p?.problem_number ?? p?.number ?? idx + 1,
    title: p?.title || `DSA Problem ${idx + 1}`,
    description: p?.description || "",
    difficulty: (p?.difficulty || "medium").toString().toLowerCase(),
    time_minutes: Number(p?.time_minutes) || 20,
    expected_approach: p?.expected_approach || p?.hint || "",
    sample_input: p?.sample_input || "",
    sample_output: p?.sample_output || "",
    hint: p?.hint || "",
    test_cases: testCases,
  };
}

function normalizeCoding(t: any, idx: number) {
  return {
    task_number: t?.task_number ?? t?.number ?? idx + 1,
    title: t?.title || `Coding Task ${idx + 1}`,
    description: t?.description || "",
    difficulty: (t?.difficulty || "medium").toString().toLowerCase(),
    time_minutes: Number(t?.time_minutes) || 30,
    tech_stack: t?.tech_stack || "",
    requirements: Array.isArray(t?.requirements) ? t.requirements : [],
  };
}

function normalizeMcq(q: any, idx: number) {
  let options: string[] = [];
  if (Array.isArray(q?.options) && q.options.length >= 4) {
    options = q.options.slice(0, 4).map((o: any) => String(o));
  } else {
    options = [q?.option_a, q?.option_b, q?.option_c, q?.option_d].map((o: any) => String(o ?? ""));
  }
  let correct = (q?.correct_answer || "A").toString().trim().toUpperCase();
  if (!["A", "B", "C", "D"].includes(correct)) correct = "A";
  return {
    question_number: q?.question_number ?? q?.number ?? idx + 1,
    question: q?.question || "",
    options,
    correct_answer: correct,
    difficulty: (q?.difficulty || "medium").toString().toLowerCase(),
    topic: q?.topic || "",
    explanation: q?.explanation || "",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const _authHeader = req.headers.get("Authorization") || "";
    if (!_authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const _userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: _authHeader } } });
    const { data: { user: _u } } = await _userClient.auth.getUser();
    if (!_u) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: _caller } = await _userClient.from("users").select("id, role, company_id").eq("user_id", _u.id).maybeSingle();
    if (!_caller || !["hr","manager","owner","superadmin"].includes(_caller.role)) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { applicationId, jobId, regenerateIndex, regenerateType, feedback } = body;
    const companyId = _caller.company_id;
    const createdBy = _caller.id;

    if (!jobId || !applicationId) {
      return new Response(JSON.stringify({ error: "Missing jobId or applicationId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("GEMINI_API_KEY");

    if (!lovableKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: job, error: jobErr } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();
    if (jobErr || !job) throw new Error("Job not found");

    const { data: application } = await supabase
      .from("applications")
      .select("candidate_id, ai_analysis, resume_score, experience_years")
      .eq("id", applicationId)
      .maybeSingle();

    let resumeContext = "Not available";
    if (application?.ai_analysis) {
      try {
        resumeContext = JSON.stringify(application.ai_analysis).slice(0, 4000);
      } catch {
        resumeContext = String(application.ai_analysis).slice(0, 4000);
      }
    }
    const candidateExp = application?.experience_years ?? "N/A";
    const minExp = job.experience_min ?? job.min_experience ?? 0;
    const maxExp = job.experience_max ?? job.max_experience ?? candidateExp;

    const skills = Array.isArray(job.skills_required) && job.skills_required.length > 0
      ? job.skills_required.join(", ")
      : "Not specified";

    let prompt: string;

    if (regenerateIndex !== undefined && regenerateIndex !== null) {
      const t = regenerateType || "mcq";
      prompt = `You are a senior technical interviewer.
Regenerate ONE ${t.toUpperCase()} question for this role.

Job Title: ${job.title}
Required Skills: ${skills}
Experience Required: ${minExp} to ${maxExp} years
Job Description: ${job.job_description || job.description || "Not provided"}
Candidate Resume Summary: ${resumeContext}

Feedback on previous question: ${feedback || "Not relevant - generate a better one"}

Return ONLY valid JSON, no markdown, matching the schema for ${t}:
${t === "dsa" ? '{"problem_number":1,"title":"...","description":"...","difficulty":"Easy|Medium|Hard","time_minutes":20,"sample_input":"...","sample_output":"...","hint":"...","test_cases":[{"input":"...","output":"..."},{"input":"...","output":"..."}]}'
: t === "coding" ? '{"task_number":1,"title":"...","description":"...","tech_stack":"...","difficulty":"Easy|Medium|Hard","time_minutes":30,"requirements":["...","...","..."]}'
: '{"question_number":1,"question":"...","option_a":"...","option_b":"...","option_c":"...","option_d":"...","correct_answer":"A|B|C|D","topic":"...","difficulty":"Easy|Medium|Hard","explanation":"..."}'}`;
    } else {
      prompt = `You are a senior technical interviewer.
Generate a complete technical assessment for this candidate and role.

Job Title: ${job.title}
Required Skills: ${skills}
Experience Required: ${minExp} to ${maxExp} years
Job Description: ${job.job_description || job.description || "Not provided"}
Candidate Resume Summary: ${resumeContext}

Generate exactly:
- 3 DSA Problems (coding challenges)
- 3 Role Specific Coding Tasks
- 10 Technical MCQ Questions

Return ONLY valid JSON with no markdown, exactly matching this schema:
{
  "dsa_problems": [
    {
      "number": 1,
      "title": "problem title",
      "description": "full problem statement",
      "difficulty": "Easy",
      "time_minutes": 20,
      "sample_input": "example input",
      "sample_output": "expected output",
      "hint": "optional hint",
      "test_cases": [
        { "input": "test1", "output": "result1" },
        { "input": "test2", "output": "result2" }
      ]
    }
  ],
  "coding_tasks": [
    {
      "number": 1,
      "title": "task title",
      "description": "what to build",
      "tech_stack": "React TypeScript",
      "difficulty": "Medium",
      "time_minutes": 30,
      "requirements": ["req1", "req2", "req3"]
    }
  ],
  "mcq_questions": [
    {
      "number": 1,
      "question": "question text",
      "option_a": "first option",
      "option_b": "second option",
      "option_c": "third option",
      "option_d": "fourth option",
      "correct_answer": "B",
      "topic": "React Hooks",
      "difficulty": "Medium",
      "explanation": "why this answer is correct"
    }
  ]
}

Rules:
- Exactly 3 DSA, 3 coding tasks, 10 MCQs.
- correct_answer MUST be exactly one of "A","B","C","D".
- Make every question highly relevant to the job's required skills and the candidate's resume.
- Mix difficulties: ~30% Easy, 50% Medium, 20% Hard.
- No prose outside the JSON. No code fences.`;
    }

    const aiResponse = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: "You are an expert technical interviewer. Always respond with valid JSON only, no markdown fences, no commentary." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      const status = aiResponse.status === 429 ? 429 : aiResponse.status === 402 ? 402 : 500;
      const msg = status === 429 ? "Rate limited, please try again later"
        : status === 402 ? "AI credits exhausted. Please add credits."
        : `AI error: ${aiResponse.status}`;
      return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "";
    let parsed: any;
    try {
      parsed = extractJson(aiContent);
    } catch (e) {
      console.error("Parse error. Raw:", aiContent.slice(0, 800));
      throw new Error("Failed to parse AI-generated questions");
    }

    if (regenerateIndex !== undefined && regenerateIndex !== null) {
      const t = regenerateType || "mcq";
      const question = t === "dsa" ? normalizeDsa(parsed, regenerateIndex)
        : t === "coding" ? normalizeCoding(parsed, regenerateIndex)
        : normalizeMcq(parsed, regenerateIndex);
      return new Response(JSON.stringify({ success: true, question }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dsaArr = Array.isArray(parsed?.dsa_problems) ? parsed.dsa_problems : [];
    const codingArr = Array.isArray(parsed?.coding_tasks) ? parsed.coding_tasks : [];
    const mcqArr = Array.isArray(parsed?.mcq_questions) ? parsed.mcq_questions : [];

    if (dsaArr.length === 0 && codingArr.length === 0 && mcqArr.length === 0) {
      console.error("AI returned empty sections:", JSON.stringify(parsed).slice(0, 500));
      throw new Error("AI did not return structured questions. Please try again.");
    }

    const questions = {
      dsa_problems: dsaArr.map((p: any, i: number) => normalizeDsa(p, i)),
      coding_tasks: codingArr.map((t: any, i: number) => normalizeCoding(t, i)),
      mcq_questions: mcqArr.map((q: any, i: number) => normalizeMcq(q, i)),
      ai_message_to_hr: parsed?.ai_message_to_hr || "Technical questions generated based on role and resume. Please review.",
      ai_message_to_manager: parsed?.ai_message_to_manager || "Technical questions generated for your review.",
    };

    if (companyId && createdBy) {
      const { data: assessment, error: insertErr } = await supabase
        .from("assessments")
        .insert({
          job_id: jobId,
          company_id: companyId,
          application_id: applicationId,
          questions,
          status: "pending_approval",
          created_by: createdBy,
          type: "technical",
        })
        .select("id")
        .single();
      if (insertErr) throw new Error("Failed to save assessment: " + insertErr.message);

      const { data: staffUsers } = await supabase
        .from("users")
        .select("id, role")
        .eq("company_id", companyId)
        .in("role", ["hr", "manager"]);

      const { data: candidateUser } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", application?.candidate_id)
        .maybeSingle();
      const candidateName = candidateUser?.full_name || "a candidate";

      if (staffUsers && staffUsers.length > 0) {
        const notifications = staffUsers.map((staff) => ({
          user_id: staff.id,
          title: "🤖 Technical Questions Ready",
          message: `AI generated technical questions for ${candidateName}. Both HR and Manager must approve before the candidate gets access.`,
        }));
        await supabase.from("notifications").insert(notifications);
      }

      return new Response(JSON.stringify({ success: true, assessmentId: assessment.id, questions }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, questions }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-technical error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
