import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const { data: _caller } = await _userClient.from("users").select("id, role, company_id").eq("user_id", _u.id).maybeSingle();
    if (!_caller || !["hr","manager","owner","superadmin"].includes(_caller.role)) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { applicationId, jobId, regenerateIndex, feedback } = body;
    // Force companyId and createdBy from verified session, never trust client values
    const companyId = _caller.company_id;
    const createdBy = _caller.id;

    if (!jobId) {
      return new Response(JSON.stringify({ error: "Missing jobId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const aiGatewayApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!aiGatewayApiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }


    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch job details
    const { data: job, error: jobErr } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();

    if (jobErr || !job) {
      throw new Error("Job not found: " + (jobErr?.message || ""));
    }

    // Never create a second aptitude assessment for the same application —
    // reuse the one already generated/sent so HR does not regenerate questions.
    if (applicationId && regenerateIndex === undefined) {
      const { data: existing } = await supabase
        .from("assessments")
        .select("id, status, questions")
        .eq("application_id", applicationId)
        .eq("type", "aptitude")
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({
          success: true,
          assessmentId: existing.id,
          questions: existing.questions,
          status: existing.status,
          source: existing.status === "approved" ? "pre_uploaded" : "existing",
          reused: true,
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Check if job has pre-uploaded aptitude questions
    if (job.aptitude_questions && regenerateIndex === undefined) {
      // Use HR's own uploaded questions directly — no AI generation, no review step.
      const parsed = job.aptitude_questions;

      if (applicationId && companyId && createdBy) {
        const { data: assessment, error: insertErr } = await supabase
          .from("assessments")
          .insert({
            job_id: jobId,
            company_id: companyId,
            application_id: applicationId,
            questions: parsed,
            type: "aptitude",
            status: "approved",
            hr_approved: true,
            manager_approved: true,
            hr_approved_at: new Date().toISOString(),
            manager_approved_at: new Date().toISOString(),
            approved_at: new Date().toISOString(),
            created_by: createdBy,
          })
          .select("id")
          .single();

        if (insertErr) {
          console.error("Insert error:", insertErr);
          throw new Error("Failed to save assessment: " + insertErr.message);
        }

        return new Response(JSON.stringify({ success: true, assessmentId: assessment.id, questions: parsed, source: "pre_uploaded" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, questions: parsed, source: "pre_uploaded" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build prompt for AI generation (fallback when no pre-uploaded questions)
    let prompt: string;

    if (regenerateIndex !== undefined && regenerateIndex !== null) {
      // Regenerate a single question
      prompt = `You are an expert HR recruiter.
Regenerate ONE aptitude test question for this job role.

Job Title: ${job.title}
Required Skills: ${(job.skills_required || []).join(", ") || "Not specified"}
Experience: ${job.experience_min ?? "N/A"} to ${job.experience_max ?? "N/A"} years
Job Description: ${job.job_description || "Not provided"}

The previous question was rejected. Reason: ${feedback || "Not relevant"}

Generate a replacement question for the same section. Return ONLY JSON:
{
  "question_number": ${regenerateIndex + 1},
  "question": "question text",
  "options": ["A", "B", "C", "D"],
  "correct_answer": "A or B or C or D",
  "difficulty": "easy or medium or hard",
  "time_seconds": 60
}`;
    } else {
      // Generate all 40 questions
      prompt = `You are an expert HR recruiter.
Create 40 aptitude test questions for this job role.

Job Title: ${job.title}
Required Skills: ${(job.skills_required || []).join(", ") || "Not specified"}
Experience: ${job.experience_min ?? "N/A"} to ${job.experience_max ?? "N/A"} years
Job Description: ${job.job_description || "Not provided"}

Create questions in 4 sections:
Section 1: 10 Logical Reasoning MCQ
Section 2: 10 Quantitative Aptitude MCQ
Section 3: 10 English Verbal MCQ
Section 4: 10 Technical MCQ based on job skills

Return ONLY valid JSON:
{
  "sections": [
    {
      "name": "section name",
      "questions": [
        {
          "question_number": 1,
          "question": "question text",
          "options": ["option A", "option B", "option C", "option D"],
          "correct_answer": "A",
          "difficulty": "easy",
          "time_seconds": 60
        }
      ]
    }
  ]
}

IMPORTANT: correct_answer must be exactly one of: "A", "B", "C", or "D".
Make questions relevant to the job role and skill level.
Mix difficulties: 40% easy, 40% medium, 20% hard.`;
    }

    const aiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiGatewayApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-3.6-flash",
        messages: [
          { role: "system", content: "You are an expert HR recruiter AI. Always respond with valid JSON only, no markdown code fences." },
          { role: "user", content: prompt },
        ],
        max_tokens: 8000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const cleaned = aiContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", aiContent);
      throw new Error("Failed to parse AI-generated questions");
    }

    // If regenerating single question, just return it
    if (regenerateIndex !== undefined && regenerateIndex !== null) {
      return new Response(JSON.stringify({ success: true, question: parsed }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save full assessment
    if (applicationId && companyId && createdBy) {
      const { data: assessment, error: insertErr } = await supabase
        .from("assessments")
        .insert({
          job_id: jobId,
          company_id: companyId,
          application_id: applicationId,
          questions: parsed,
          type: "aptitude",
          status: "pending_approval",
          created_by: createdBy,
        })
        .select("id")
        .single();

      if (insertErr) {
        console.error("Insert error:", insertErr);
        throw new Error("Failed to save assessment: " + insertErr.message);
      }

      return new Response(JSON.stringify({ success: true, assessmentId: assessment.id, questions: parsed }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, questions: parsed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-assessment error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
