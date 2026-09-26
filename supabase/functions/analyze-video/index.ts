import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function arrayBufferToBase64(buffer: Uint8Array): string {
  const chunkSize = 0x8000;
  const chunks: string[] = [];
  for (let i = 0; i < buffer.byteLength; i += chunkSize) {
    chunks.push(String.fromCharCode(...buffer.subarray(i, i + chunkSize)));
  }
  return btoa(chunks.join(""));
}

function extractJsonObject(content: string) {
  const cleaned = content.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("Invalid JSON response received from AI model.");
  }
}

function normalizeAnalysis(analysis: any) {
  const metricKeys = [
    "energy_level", "eye_contact", "english_fluency", "vocabulary",
    "communication_skills", "confidence", "body_language", "content_quality",
    "professionalism", "overall_impression",
  ];

  for (const key of metricKeys) {
    const metric = analysis[key] || {};
    const rawScore = Number(metric.score ?? 0);
    analysis[key] = {
      score: Math.max(1, Math.min(10, Math.round(rawScore || 1))),
      feedback: String(metric.feedback || "Observed from the uploaded video recording."),
    };
  }

  const calculatedScore = Math.round(
    metricKeys.reduce((sum, key) => sum + Number(analysis[key].score || 0), 0) / metricKeys.length * 10,
  );

  analysis.overall_score = Math.max(0, Math.min(100, Math.round(Number(analysis.overall_score ?? calculatedScore))));
  analysis.verdict = ["strong", "average", "weak"].includes(analysis.verdict) ? analysis.verdict : analysis.overall_score >= 75 ? "strong" : analysis.overall_score >= 50 ? "average" : "weak";
  analysis.summary = String(analysis.summary || "AI completed the video review and scored the candidate across communication, presentation, confidence, and professionalism.");
  analysis.strengths = Array.isArray(analysis.strengths) ? analysis.strengths.map(String).slice(0, 5) : [];
  analysis.improvements = Array.isArray(analysis.improvements) ? analysis.improvements.map(String).slice(0, 5) : [];
  analysis.status = "completed";
  return analysis;
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
    const geminiApiKey = Deno.env.get("GEMINI_VIDEO_API_KEY") || Deno.env.get("GEMINI_API_KEY");
    if (!lovableApiKey && !geminiApiKey) throw new Error("AI service is not configured");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: application, error: appErr } = await supabase
      .from("applications")
      .select("*")
      .eq("id", applicationId)
      .maybeSingle();

    if (appErr || !application) throw new Error("Application not found");
    if (_caller.role === "candidate" && application.candidate_id !== _caller.id) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!application.video_url) throw new Error("No video uploaded");

    // Mark as processing
    await supabase
      .from("applications")
      .update({ video_analysis: { status: "processing" } })
      .eq("id", applicationId);

    EdgeRuntime.waitUntil(processVideoAnalysis(supabase, application, { lovableApiKey, geminiApiKey }));

    return new Response(JSON.stringify({ success: true, status: "processing" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("analyze-video error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processVideoAnalysis(
  supabase: any,
  application: any,
  keys: { lovableApiKey?: string | null; geminiApiKey?: string | null },
) {
  try {
    const { data: job } = await supabase
      .from("jobs")
      .select("title, department, skills_required")
      .eq("id", application.job_id)
      .maybeSingle();

    const { data: candidate } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", application.candidate_id)
      .maybeSingle();

    // Download video file bytes from Supabase Storage
    const { data: fileData, error: downloadErr } = await supabase.storage
      .from("videos")
      .download(application.video_url);

    if (downloadErr || !fileData) {
      throw new Error("Could not download video file: " + (downloadErr?.message || ""));
    }

    const fileBytes = new Uint8Array(await fileData.arrayBuffer());

    // Determine the video MIME type
    let mimeType = "video/webm"; // Default since webm is recorded
    const lowerUrl = application.video_url.toLowerCase();
    if (lowerUrl.endsWith(".mp4")) {
      mimeType = "video/mp4";
    } else if (lowerUrl.endsWith(".webm")) {
      mimeType = "video/webm";
    } else if (lowerUrl.endsWith(".mov")) {
      mimeType = "video/quicktime";
    }

    const prompt = `You are an expert HR recruitment analyst reviewing a candidate's video introduction.

Candidate: ${candidate?.full_name || "Unknown"}
Applied for: ${job?.title || "Unknown"} (${job?.department || ""})
Required Skills: ${(job?.skills_required || []).join(", ") || "Not specified"}

IMPORTANT: You are analyzing a video recording. Watch and listen carefully to evaluate ALL aspects including visual body language and audio speech quality.

Analyze this video introduction thoroughly and evaluate the candidate on these parameters:

1. Energy Level - How enthusiastic, motivated, and energetic is the candidate? Look at facial expressions, voice tone, and gestures.
2. Eye Contact - Does the candidate maintain good eye contact with the camera? Are they looking at the camera or looking away?
3. English Fluency - How fluent is their English? Listen for grammar, pronunciation, flow, hesitations, filler words.
4. Vocabulary - Quality and richness of vocabulary used. Are they using professional and varied language?
5. Communication Skills - Clarity of expression, structure of thoughts, articulation. Can they convey ideas clearly?
6. Confidence - How confident does the candidate appear? Voice steadiness, posture, lack of nervousness.
7. Body Language - Posture, gestures, facial expressions. Are they sitting upright? Using hand gestures appropriately?
8. Content Quality - Relevance and depth of what they talked about. Did they cover their background, skills, and motivation?
9. Professionalism - Overall professional demeanor and presentation. Appropriate attire, background, and manner.
10. Overall Impression - General suitability for the role based on all factors.

SCORING GUIDELINES:
- Be STRICT and REALISTIC. Do NOT give inflated scores.
- Score 1-3: Poor performance in this area
- Score 4-5: Below average, needs improvement
- Score 6-7: Average to good
- Score 8-9: Very good
- Score 10: Exceptional, outstanding
- Most candidates should score between 4-7 on average metrics. Only truly exceptional candidates get 8+.

CRITICAL — SCORES MUST BE EVIDENCE-BASED AND DIFFERENTIATED:
- Every metric score MUST be justified by something you actually saw or heard in THIS recording. In each "feedback", quote or paraphrase a concrete moment from the video (a phrase they said, a gesture, a pause, where they looked).
- Do NOT output the same or near-identical score for every metric. A real candidate is stronger in some areas and weaker in others — the ten metrics should span at least a 3-point range unless the performance is genuinely uniform.
- Never fall back on generic template wording like "good communication skills" with no evidence.
- If the video has no audible speech, no visible person, or is unusably short, score the affected metrics 1-2 and say so explicitly in the feedback and summary.
- Derive the transcript first, then score from that transcript plus what you observed visually.

ALSO: Produce a full verbatim TRANSCRIPT of everything the candidate said in the video (in speaking order, do not summarize, keep filler words). Put it in the "transcript" field.

Return ONLY valid JSON. Do not include markdown, code fences, or explanation outside the JSON.`;

    if (fileBytes.byteLength === 0) {
      throw new Error("Uploaded video file is empty. Please ask the candidate to record again.");
    }

    if (fileBytes.byteLength > 18 * 1024 * 1024) {
      throw new Error("Video is too large for reliable AI analysis. Please ask the candidate to record again in a shorter/lower-quality 3-4 minute video.");
    }

    // Convert video file to base64
    const base64Data = arrayBufferToBase64(fileBytes);
    const analysisSchema = {
            type: "OBJECT",
            properties: {
              overall_score: { 
                type: "INTEGER",
                description: "A score between 0 and 100 representing the candidate's average score across all parameters."
              },
              energy_level: {
                type: "OBJECT",
                properties: {
                  score: { type: "INTEGER" },
                  feedback: { type: "STRING" }
                },
                required: ["score", "feedback"]
              },
              eye_contact: {
                type: "OBJECT",
                properties: {
                  score: { type: "INTEGER" },
                  feedback: { type: "STRING" }
                },
                required: ["score", "feedback"]
              },
              english_fluency: {
                type: "OBJECT",
                properties: {
                  score: { type: "INTEGER" },
                  feedback: { type: "STRING" }
                },
                required: ["score", "feedback"]
              },
              vocabulary: {
                type: "OBJECT",
                properties: {
                  score: { type: "INTEGER" },
                  feedback: { type: "STRING" }
                },
                required: ["score", "feedback"]
              },
              communication_skills: {
                type: "OBJECT",
                properties: {
                  score: { type: "INTEGER" },
                  feedback: { type: "STRING" }
                },
                required: ["score", "feedback"]
              },
              confidence: {
                type: "OBJECT",
                properties: {
                  score: { type: "INTEGER" },
                  feedback: { type: "STRING" }
                },
                required: ["score", "feedback"]
              },
              body_language: {
                type: "OBJECT",
                properties: {
                  score: { type: "INTEGER" },
                  feedback: { type: "STRING" }
                },
                required: ["score", "feedback"]
              },
              content_quality: {
                type: "OBJECT",
                properties: {
                  score: { type: "INTEGER" },
                  feedback: { type: "STRING" }
                },
                required: ["score", "feedback"]
              },
              professionalism: {
                type: "OBJECT",
                properties: {
                  score: { type: "INTEGER" },
                  feedback: { type: "STRING" }
                },
                required: ["score", "feedback"]
              },
              overall_impression: {
                type: "OBJECT",
                properties: {
                  score: { type: "INTEGER" },
                  feedback: { type: "STRING" }
                },
                required: ["score", "feedback"]
              },
              verdict: { 
                type: "STRING", 
                enum: ["strong", "average", "weak"],
                description: "Overall verdict on the video introduction."
              },
              summary: { 
                type: "STRING",
                description: "3-4 sentence summary of candidate performance."
              },
              strengths: { 
                type: "ARRAY", 
                items: { type: "STRING" },
                description: "List of key strengths noticed in the video."
              },
              improvements: { 
                type: "ARRAY", 
                items: { type: "STRING" },
                description: "List of areas to improve."
              },
              transcript: {
                type: "STRING",
                description: "Full verbatim transcript of everything the candidate said in the video, in speaking order. Do not summarize."
              }
            },
            required: [
              "overall_score", "energy_level", "eye_contact", "english_fluency", 
              "vocabulary", "communication_skills", "confidence", "body_language", 
              "content_quality", "professionalism", "overall_impression", "verdict", 
              "summary", "strengths", "improvements", "transcript"
            ]
          };

    let aiContent = "";

    // Only a model that can actually watch the video may score it. If none of
    // them work we fail loudly instead of writing a generic look-alike score.
    const GEMINI_VIDEO_MODELS = ["gemini-flash-latest", "gemini-3.5-flash", "gemini-flash-lite-latest"];

    const tryGemini = async () => {
      if (!keys.geminiApiKey) return null;
      for (const model of GEMINI_VIDEO_MODELS) {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keys.geminiApiKey}`;
        const aiResponse = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [
              { inlineData: { mimeType, data: base64Data } },
              { text: prompt },
            ]}],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: analysisSchema,
              temperature: 0,
            },
          }),
        });
        if (!aiResponse.ok) {
          console.error("Gemini API error:", model, aiResponse.status, await aiResponse.text());
          continue;
        }
        const aiData = await aiResponse.json();
        const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (text) return text;
      }
      return null;
    };

    aiContent = (await tryGemini()) || "";
    if (!aiContent) throw new Error("AI video analysis failed. The video model could not read this recording — please retry.");


    const analysis = normalizeAnalysis(extractJsonObject(aiContent));

    await supabase
      .from("applications")
      .update({
        video_score: analysis.overall_score,
        video_analysis: analysis,
        // NO auto-progression after video. HR / Hiring Manager reviews the
        // video AI analysis and manually advances the candidate to technical.
        current_stage: "video_completed",
      })
      .eq("id", application.id);

    // Notify candidate that video was reviewed (waiting on HR)
    try {
      await supabase.from("notifications").insert({
        user_id: application.candidate_id,
        title: "🎥 Video Reviewed",
        message: `Your video introduction has been analyzed (score: ${analysis.overall_score}/100). The hiring team will review it and get back to you with next steps.`,
        category: "application",
        type: "stage",
      });
    } catch (_) { /* ignore */ }

    console.log("Video analysis complete for application:", application.id);
  } catch (err) {
    console.error("Background video analysis failed:", err);
    await supabase
      .from("applications")
      .update({
        video_analysis: {
          status: "failed",
          error: err instanceof Error ? err.message : "Unknown error",
        },
      })
      .eq("id", application.id);
  }
}
