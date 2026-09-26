import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { sendStageEmail } from "../_shared/stage-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AnswerRow = { question_index: number; selected_option: number | null; time_spent_seconds: number };

function resolveCorrectIndex(correctAnswer: unknown, options: unknown): number {
  const ca = String(correctAnswer ?? "").trim();
  if (!ca) return -1;
  const upper = ca.toUpperCase();
  // Single letter A-D (or A-Z)
  if (upper.length === 1 && upper >= "A" && upper <= "Z") {
    return upper.charCodeAt(0) - 65;
  }
  // "Option A" / "Answer B"
  const m = upper.match(/\b([A-Z])\b/);
  if (m && upper.length <= 12) {
    return m[1].charCodeAt(0) - 65;
  }
  // Digit 0-9
  if (/^\d+$/.test(ca)) return parseInt(ca, 10);
  // Full option text match
  if (Array.isArray(options)) {
    const idx = (options as unknown[]).findIndex(
      (opt) => String(opt).trim().toLowerCase() === ca.toLowerCase()
    );
    if (idx >= 0) return idx;
  }
  return -1;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const { applicationId, answers, timings } = body as {
      applicationId?: string;
      answers?: Array<number | null>;
      timings?: number[];
    };
    if (!applicationId || !Array.isArray(answers)) {
      return new Response(JSON.stringify({ error: "Missing applicationId or answers" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(url, service);

    // Fetch application & verify candidate owns it
    const { data: app, error: appErr } = await admin
      .from("applications")
      .select("id, candidate_id, job_id")
      .eq("id", applicationId)
      .maybeSingle();
    if (appErr || !app) {
      return new Response(JSON.stringify({ error: "Application not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: me } = await admin.from("users").select("id, role").eq("user_id", user.id).maybeSingle();
    if (!me || me.id !== app.candidate_id) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Duplicate submission guard
    const { count: existing } = await admin
      .from("test_answers")
      .select("id", { count: "exact", head: true })
      .eq("application_id", applicationId);
    if ((existing ?? 0) > 0) {
      return new Response(JSON.stringify({ error: "already_submitted" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch approved assessment
    const { data: assessment } = await admin
      .from("assessments")
      .select("questions")
      .eq("application_id", applicationId)
      .eq("status", "approved")
      .maybeSingle();

    // Flatten questions in the same order the client used
    const flat: Array<{ correct_answer: unknown; options: unknown }> = [];
    const qs: any = assessment?.questions;
    if (qs?.sections && Array.isArray(qs.sections)) {
      for (const section of qs.sections) {
        for (const q of section.questions || []) {
          flat.push({ correct_answer: q.correct_answer, options: q.options });
        }
      }
    } else if (Array.isArray(qs)) {
      for (const q of qs) flat.push({ correct_answer: q.correct_answer, options: q.options });
    }

    // Score
    let correct = 0;
    const total = Math.max(flat.length, answers.length);
    for (let i = 0; i < flat.length; i++) {
      const ans = answers[i];
      if (ans === null || ans === undefined) continue;
      const correctIdx = resolveCorrectIndex(flat[i].correct_answer, flat[i].options);
      if (correctIdx >= 0 && ans === correctIdx) correct++;
    }
    const score = total > 0 ? Math.round((correct / total) * 10000) / 100 : 0;

    // Insert test_answers
    const rows: AnswerRow[] = answers.map((ans, i) => ({
      question_index: i,
      selected_option: ans,
      time_spent_seconds: timings?.[i] ?? 0,
    }));
    const insertRows = rows.map((r) => ({ ...r, application_id: applicationId }));
    const { error: insertErr } = await admin.from("test_answers").insert(insertRows);
    if (insertErr) {
      return new Response(JSON.stringify({ error: "Failed to save answers: " + insertErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch job cutoff
    const { data: job } = await admin
      .from("jobs")
      .select("company_id, title, aptitude_cutoff")
      .eq("id", app.job_id)
      .maybeSingle();

    const cutoff = job?.aptitude_cutoff ?? 60;
    const passed = score >= cutoff;

    // AUTO-PROGRESSION: on pass, advance directly to video_intro so the
    // candidate is immediately invited to the next stage — no HR click needed.
    const updatePayload: Record<string, unknown> = {
      test_score: score,
      current_stage: passed ? "video_intro" : "test_failed",
      test_status: passed ? "passed" : "failed",
    };
    if (!passed) {
      updatePayload.status = "rejected";
      updatePayload.rejection_stage = "aptitude_test";
      updatePayload.rejection_reason = "below_cutoff";
    }

    const { error: updErr } = await admin.from("applications").update(updatePayload).eq("id", applicationId);
    if (updErr) {
      return new Response(JSON.stringify({ error: "Failed to update application: " + updErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Notifications (best-effort)
    try {
      if (passed) {
        await admin.from("notifications").insert({
          user_id: app.candidate_id,
          title: "🎉 Aptitude Cleared — Next: Video Introduction",
          message: `You scored ${score}% on the aptitude test${job?.title ? ` for ${job.title}` : ""}. Please record your 3-4 minute video introduction from your dashboard.`,
          category: "application",
          type: "stage",
        });
      } else {
        await admin.from("notifications").insert({
          user_id: app.candidate_id,
          title: "Aptitude Test Result",
          message: `Thank you for taking the aptitude test${job?.title ? ` for ${job.title}` : ""}. Unfortunately, your score (${score}%) did not meet the cutoff of ${cutoff}%.`,
          category: "application",
          type: "stage",
        });
      }
      if (job) {
        const { data: hrUsers } = await admin
          .from("users").select("id").eq("company_id", job.company_id).eq("role", "hr");
        for (const hr of hrUsers || []) {
          await admin.from("notifications").insert({
            user_id: hr.id,
            title: passed ? "Candidate cleared aptitude → moved to video" : "Candidate failed aptitude",
            message: `A candidate scored ${score}% on the aptitude test for ${job.title}.`,
          });
        }
      }
    } catch (_) { /* ignore notification errors */ }

    // Automated candidate email (pass → next round, fail → auto rejection)
    try {
      await sendStageEmail(admin, passed
        ? {
            applicationId,
            event: "shortlisted",
            stage: "aptitude_test",
            nextStage: "video_intro",
            score: `${score}%`,
          }
        : {
            applicationId,
            event: "auto_rejected",
            stage: "aptitude_test",
            score: `${score}%`,
            cutoff: `${cutoff}%`,
          });
    } catch (_) { /* email is best-effort */ }


    return new Response(JSON.stringify({ success: true, score, passed, correct, total }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("submit-aptitude-test error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
