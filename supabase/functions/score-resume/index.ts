import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function arrayBufferToBase64(buffer: Uint8Array): string {
  let binary = "";
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
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
    const { data: _caller } = await _userClient.from("users").select("id, role").eq("user_id", _u.id).maybeSingle();
    if (!_caller || !["hr","manager","owner","superadmin","candidate"].includes(_caller.role)) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { applicationId } = await req.json();
    if (!applicationId) {
      return new Response(JSON.stringify({ error: "Missing applicationId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!lovableApiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }


    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch application
    const { data: application, error: appErr } = await supabase
      .from("applications")
      .select("*")
      .eq("id", applicationId)
      .maybeSingle();

    if (appErr || !application) {
      throw new Error("Application not found: " + (appErr?.message || ""));
    }

    if (_caller.role === "candidate" && application.candidate_id !== _caller.id) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch candidate info separately
    const { data: candidate } = await supabase
      .from("users")
      .select("id, full_name, email, phone")
      .eq("id", application.candidate_id)
      .maybeSingle();

    // Fetch the candidate's rich profile so the AI has projects / education /
    // internships to score against (critical for freshers & students who have
    // little or no formal work experience).
    const { data: profile } = candidate
      ? await supabase
          .from("candidate_profiles")
          .select("headline, about_me, skills, education, experiences, projects, location, linkedin_url, github_url, portfolio_url")
          .eq("user_id", candidate.id)
          .maybeSingle()
      : { data: null as any };

    const { data: job, error: jobErr } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", application.job_id)
      .maybeSingle();

    if (jobErr || !job) {
      throw new Error("Job not found: " + (jobErr?.message || ""));
    }

    // Decide candidate career stage from years of experience so the prompt
    // can apply the right rubric (fresher vs experienced).
    const years = Number(application.experience_years ?? 0);
    const jobMin = Number(job.experience_min ?? 0);
    const jobMax = Number(job.experience_max ?? 99);
    const jobIsFresher = jobMin <= 1; // 0-1 / fresher roles
    const stage: "student" | "fresher" | "experienced" =
      years <= 0 ? "student" : years < 1.5 ? "fresher" : "experienced";

    // Retrieve resume file bytes and determine mime type
    let fileBytes: Uint8Array | null = null;
    let mimeType = "";
    let resumeText = "";

    if (application.resume_url) {
      try {
        const resumeRef = String(application.resume_url);

        if (!resumeRef.startsWith("http")) {
          const { data: fileData, error: fileErr } = await supabase.storage.from("resumes").download(resumeRef);
          if (!fileErr && fileData) {
            fileBytes = new Uint8Array(await fileData.arrayBuffer());
            const lowerRef = resumeRef.toLowerCase();
            if (lowerRef.endsWith(".pdf")) {
              mimeType = "application/pdf";
            } else if (lowerRef.endsWith(".jpg") || lowerRef.endsWith(".jpeg")) {
              mimeType = "image/jpeg";
            } else if (lowerRef.endsWith(".png")) {
              mimeType = "image/png";
            } else if (lowerRef.endsWith(".webp")) {
              mimeType = "image/webp";
            } else {
              const textDecoder = new TextDecoder("utf-8", { fatal: false });
              const rawText = textDecoder.decode(fileBytes);
              const textParts: string[] = [];
              const lines = rawText.split(/\r?\n/);
              for (const line of lines) {
                const printable = line.replace(/[^\x20-\x7E]/g, "");
                if (printable.length > 10 && printable.length / Math.max(line.length, 1) > 0.5) {
                  textParts.push(printable);
                }
              }
              if (textParts.length > 0) {
                resumeText = textParts.join("\n").substring(0, 8000);
              } else {
                resumeText = "Could not extract plain text from word document. Please inspect metadata.";
              }
            }
          }
        } else {
          resumeText = `Resume link: ${resumeRef}`;
        }
      } catch (e) {
        console.error("Resume download/extraction error:", e);
        resumeText = "Could not extract resume text";
      }
    }

    // Rubric varies by career stage — freshers/students should NOT be penalised
    // for missing full-time experience when the role itself targets freshers.
    const rubric =
      stage === "experienced"
        ? `EXPERIENCED CANDIDATE RUBRIC:
- Weight work experience heavily (40%), skill match (35%), career progression (15%), education (10%).
- If years (${years}) fall inside the job's required range (${jobMin}-${jobMax}), reward it; if outside, penalise proportionally.
- Look for measurable impact, scale, and seniority signals in past roles.`
        : `${stage === "student" ? "STUDENT" : "FRESHER"} CANDIDATE RUBRIC:
- This candidate has ${years} years of full-time experience. DO NOT penalise for the lack of full-time roles when the job (${jobMin}-${jobMax} yrs) accepts freshers.
- Weight: skill match (35%), projects quality + tech depth (30%), internships / training (15%), education / college tier (15%), certifications (5%).
- Treat strong personal projects, hackathons, open-source contributions and internships as the PRIMARY evidence of capability.
- A well-built fresher with relevant projects targeting a 0-1 / 0-2 yr role should land 70-85, not 30-50.
- Only score below 50 if skills clearly don't match the role.`;

    const requiredSkills: string[] = (job.skills_required || []).map((s: any) => String(s).trim()).filter(Boolean);
    const requiredSkillsList = requiredSkills.length ? requiredSkills.join(", ") : "Not specified";

    // ATS-style prompt — primary signal is keyword/skill match against the actual
    // job requirements. Score must reflect concrete skill overlap, not vibes.
    const prompt = `You are an ATS (Applicant Tracking System) resume scorer. Your job is to compute an accurate match score between THIS specific resume and THIS specific job posting using strict keyword/skill matching plus contextual evidence.

==============================
ATS SCORING METHOD (FOLLOW EXACTLY)
==============================
Step 1 — Extract every concrete skill / tool / framework / language / cloud service / methodology from the resume (synonyms count: "JS"="JavaScript", "RN"="React Native", "PSQL"="PostgreSQL", "ML"="Machine Learning", etc.).
Step 2 — Compare them against REQUIRED_SKILLS for the job below. Produce matched_skills (present in resume) and missing_skills (required but absent).
Step 3 — Compute SKILL_MATCH_PCT = matched_skills.length / max(REQUIRED_SKILLS.length, 1) * 100. Round to integer.
Step 4 — Apply the career-stage rubric below to modulate the raw skill match using projects, experience and domain fit.

==============================
${rubric}
==============================

FINAL SCORE FORMULA:
- experienced: final = round(0.55 * SKILL_MATCH_PCT + 0.25 * EXPERIENCE_FIT + 0.15 * PROJECT_QUALITY + 0.05 * EDUCATION)
- fresher/student: final = round(0.50 * SKILL_MATCH_PCT + 0.30 * PROJECT_QUALITY + 0.10 * INTERNSHIPS + 0.10 * EDUCATION)
Where every sub-score is 0-100. EXPERIENCE_FIT = 100 if candidate years (${years}) is inside [${jobMin}, ${jobMax}]; otherwise drop 15 points per year of gap (floor 0).

HARD RULES — DO NOT VIOLATE:
- If SKILL_MATCH_PCT < 20  → final score MUST be <= 35.
- If SKILL_MATCH_PCT >= 80 AND experience fit ok → final score MUST be >= 75.
- Never invent skills that are not visibly present in the resume / profile.
- Be deterministic: same resume + same JD ⇒ same score.

CTC context: Current ${application.current_ctc ?? "N/A"} LPA, Expected ${application.expected_ctc ?? "N/A"} LPA — only flag if unreasonable for the stage.

==============================
JOB POSTING
==============================
Title: ${job.title}
Department: ${job.department}
REQUIRED_SKILLS: ${requiredSkillsList}
Experience Required: ${jobMin} – ${jobMax} years
Job Description:
${job.job_description || "Not provided"}
Location: ${job.location} | Work Type: ${job.work_type}

==============================
CANDIDATE
==============================
Name: ${candidate?.full_name || "Unknown"}
Headline: ${profile?.headline || "—"}
Location: ${profile?.location || "—"}
Current Company: ${application.current_company || "—"}
Years of Experience: ${years}
Notice Period: ${application.notice_period ?? "—"} days
Self-declared Skills: ${(profile?.skills as any[] | null)?.join?.(", ") || "—"}
Education: ${JSON.stringify(profile?.education || [])}
Experience / Internships: ${JSON.stringify(profile?.experiences || [])}
Projects: ${JSON.stringify(profile?.projects || [])}
LinkedIn: ${profile?.linkedin_url || "—"} | GitHub: ${profile?.github_url || "—"} | Portfolio: ${profile?.portfolio_url || "—"}
About: ${profile?.about_me || "—"}

In ai_message_to_hr, state: (1) SKILL_MATCH_PCT and the exact matched vs missing skills, (2) the final score breakdown using the formula above, (3) 2-3 strongest evidence points, (4) 2-3 biggest concerns / gaps.`;


    // Call Gemini native generateContent (OpenAI-compat endpoint rejects PDF parts)
    const parts: any[] = [];
    if (fileBytes && mimeType) {
      const base64Data = arrayBufferToBase64(fileBytes);
      parts.push({ inline_data: { mime_type: mimeType, data: base64Data } });
    }

    let fullPrompt = prompt;
    if (resumeText) {
      fullPrompt += `\n\nCandidate Resume Text (extracted):\n${resumeText}`;
    }
    parts.push({ text: fullPrompt });

    const submitScoreSchema = {
      type: "object",
      properties: {
        score: { type: "integer" },
        matched_skills: { type: "array", items: { type: "string" } },
        missing_skills: { type: "array", items: { type: "string" } },
        experience_match: { type: "boolean" },
        education: { type: "string" },
        verdict: { type: "string", enum: ["strong", "average", "weak"] },
        recommendation: { type: "string" },
        ai_message_to_hr: { type: "string" },
      },
      required: ["score", "matched_skills", "missing_skills", "experience_match", "education", "verdict", "recommendation", "ai_message_to_hr"],
    };

    const requestBody = JSON.stringify({
      contents: [{ role: "user", parts }],
      tools: [
        {
          function_declarations: [
            {
              name: "submit_score",
              description: "Submit the resume analysis result",
              parameters: submitScoreSchema,
            },
          ],
        },
      ],
      tool_config: {
        function_calling_config: { mode: "ANY", allowed_function_names: ["submit_score"] },
      },
    });

    // Gemini regularly answers 503 ("high demand") — retry across models with
    // backoff so a transient spike never leaves an application unscored.
    const MODELS = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-2.5-flash", "gemini-flash-lite-latest"];
    let response: Response | null = null;
    let lastStatus = 0;
    let lastErr = "";
    outer: for (let attempt = 0; attempt < 3; attempt++) {
      for (const model of MODELS) {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": lovableApiKey },
            body: requestBody,
          },
        );
        if (r.ok) { response = r; break outer; }
        lastStatus = r.status;
        lastErr = await r.text();
        console.error(`AI error (${model}):`, r.status, lastErr.slice(0, 300));
        if (r.status === 402) throw new Error("AI credits exhausted. Please add credits to your workspace.");
        if (r.status !== 429 && r.status !== 503 && r.status < 500) break outer;
      }
      await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)));
    }

    if (!response) {
      if (lastStatus === 429) throw new Error("Rate limit exceeded, please try again later.");
      throw new Error(`AI error: ${lastStatus} - ${lastErr}`);
    }

    const aiData = await response.json();
    const partsOut = aiData?.candidates?.[0]?.content?.parts ?? [];
    const fnCall = partsOut.find((p: any) => p.functionCall)?.functionCall;
    const textOut = partsOut.map((p: any) => p.text).filter(Boolean).join("\n");

    // Parse AI response
    let analysis: any = fnCall?.args ?? null;
    if (!analysis) {
      try {
        const m = textOut.match(/\{[\s\S]*\}/);
        analysis = JSON.parse(m ? m[0] : textOut);
      } catch (e) {
        console.error("Failed to parse AI response:", textOut?.slice(0, 800), e);
        throw new Error("Invalid response received from AI model.");
      }
    }
    if (typeof analysis.score !== "number") analysis.score = parseInt(String(analysis.score ?? 0), 10) || 0;



    // No auto-reject / no auto-progression on resume. HR / Hiring Manager
    // reviews the AI score and decides whether to advance the candidate to
    // the aptitude stage or reject them.
    const updatePayload: any = {
      resume_score: analysis.score,
      ai_analysis: analysis,
      current_stage: "ai_scored",
    };

    const { error: updateErr } = await supabase
      .from("applications")
      .update(updatePayload)
      .eq("id", applicationId);

    if (updateErr) {
      console.error("Update error:", updateErr);
      throw new Error("Failed to save score: " + updateErr.message);
    }

    // Find HR who posted the job to notify them
    const { data: hrUser } = await supabase
      .from("users")
      .select("id, full_name")
      .eq("id", job.posted_by)
      .maybeSingle();

    const candidateName = candidate?.full_name || "A candidate";

    if (hrUser) {
      await supabase.from("notifications").insert({
        user_id: hrUser.id,
        title: "New Application Scored",
        message: `${candidateName} applied for ${job.title}. AI Score: ${analysis.score}/100. Verdict: ${analysis.verdict}. ${analysis.ai_message_to_hr}`,
        read: false,
      });
    }

    return new Response(JSON.stringify({ success: true, score: analysis.score, verdict: analysis.verdict }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("score-resume error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
