// AI Assistant chat for HireZap.
// - Candidate mode: career coach with profile + job context (markdown reply, no tools).
// - HR / Manager / Owner / Superadmin mode: live data + actions via tool-calling.
//   Tools are company-scoped via the caller's users.company_id.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MODEL = "gemini-3.6-flash";
const MAX_TOOL_ROUNDS = 10;

type Role = "owner" | "superadmin" | "hr" | "manager" | "candidate";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ------------- HR TOOL DEFINITIONS (OpenAI-compatible) -------------
const HR_TOOLS = [
  {
    type: "function",
    function: {
      name: "list_jobs",
      description: "List jobs in the HR's company with stats. Optionally filter by status (open/closed/draft).",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["open", "closed", "draft", "any"], description: "Job status filter" },
          limit: { type: "number", description: "Max rows, default 30" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_job_candidates",
      description: "List candidates (applications) for a specific job. Optionally filter by stage and/or status.",
      parameters: {
        type: "object",
        properties: {
          job_id: { type: "string" },
          stage: { type: "string", description: "applied|aptitude|video|technical|gd|hr|offer|hired|rejected" },
          status: { type: "string", description: "pending|selected|rejected|hired|deleted" },
          limit: { type: "number" },
        },
        required: ["job_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_candidate_detail",
      description: "Get full profile + scores + stage history for a single application.",
      parameters: {
        type: "object",
        properties: { application_id: { type: "string" } },
        required: ["application_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_violations",
      description: "Recent test violations (tab switch, copy/paste, cancel) for this company's jobs.",
      parameters: {
        type: "object",
        properties: {
          hours_back: { type: "number", description: "Lookback window, default 24" },
          job_id: { type: "string", description: "Optional job filter" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_top_candidates",
      description: "Top candidates ranked by composite score across stages.",
      parameters: {
        type: "object",
        properties: {
          job_id: { type: "string", description: "Optional job filter" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "close_job",
      description: "Close a job posting (status=closed). Stops new applications.",
      parameters: {
        type: "object",
        properties: { job_id: { type: "string" } },
        required: ["job_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reopen_job",
      description: "Reopen a closed job (status=open).",
      parameters: {
        type: "object",
        properties: { job_id: { type: "string" } },
        required: ["job_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reject_candidate",
      description: "Mark an application as rejected with an optional reason.",
      parameters: {
        type: "object",
        properties: {
          application_id: { type: "string" },
          reason: { type: "string" },
        },
        required: ["application_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "advance_candidate",
      description: "Advance an application to the next recruitment stage.",
      parameters: {
        type: "object",
        properties: {
          application_id: { type: "string" },
          next_stage: { type: "string", description: "Optional explicit next stage" },
        },
        required: ["application_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "soft_delete_candidate",
      description: "Soft-delete an application (status=deleted). Hidden from active views but preserved.",
      parameters: {
        type: "object",
        properties: { application_id: { type: "string" } },
        required: ["application_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_jd",
      description: "Return a clean structured job description draft for the requested role.",
      parameters: {
        type: "object",
        properties: {
          role: { type: "string" },
          seniority: { type: "string", description: "Junior|Mid|Senior|Lead" },
          skills: { type: "array", items: { type: "string" } },
          notes: { type: "string" },
        },
        required: ["role"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_candidate",
      description: "Find applications by candidate name or email (partial match). Use this to resolve a name into an application_id before acting.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Name or email substring" },
          job_id: { type: "string", description: "Optional restrict to a job" },
          limit: { type: "number" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_resume_url",
      description: "Return a short-lived signed URL to view a candidate's resume PDF.",
      parameters: {
        type: "object",
        properties: { application_id: { type: "string" } },
        required: ["application_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_interviews",
      description: "List scheduled/completed interviews. Optional filters: job_id, application_id, status, upcoming_only.",
      parameters: {
        type: "object",
        properties: {
          job_id: { type: "string" },
          application_id: { type: "string" },
          status: { type: "string" },
          upcoming_only: { type: "boolean" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "schedule_interview",
      description: "Schedule an interview for a candidate. Date format YYYY-MM-DD, time HH:MM.",
      parameters: {
        type: "object",
        properties: {
          application_id: { type: "string" },
          round_type: { type: "string", description: "hr_interview|technical|managerial" },
          scheduled_date: { type: "string" },
          scheduled_time: { type: "string" },
          duration: { type: "number" },
          mode: { type: "string", description: "video_call|in_person|phone" },
          meeting_link: { type: "string" },
          interviewer_name: { type: "string" },
          notes: { type: "string" },
        },
        required: ["application_id", "scheduled_date", "scheduled_time"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_group_discussions",
      description: "List group discussions for company, with groups, candidates, and scores.",
      parameters: {
        type: "object",
        properties: {
          job_id: { type: "string" },
          gd_id: { type: "string" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_offers",
      description: "List offer letters issued by company. Optional filters: status, job_id, application_id.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "sent|accepted|declined|negotiating" },
          job_id: { type: "string" },
          application_id: { type: "string" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "hire_candidate",
      description: "Mark a candidate as hired (final stage). Notifies them.",
      parameters: {
        type: "object",
        properties: { application_id: { type: "string" } },
        required: ["application_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_chat_with_candidate",
      description: "Get the HR<->candidate direct chat thread for an application.",
      parameters: {
        type: "object",
        properties: {
          application_id: { type: "string" },
          limit: { type: "number" },
        },
        required: ["application_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_chat_to_candidate",
      description: "Send a direct chat message from this HR to the candidate of an application.",
      parameters: {
        type: "object",
        properties: {
          application_id: { type: "string" },
          message: { type: "string" },
        },
        required: ["application_id", "message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_next_action",
      description: "Recommend the best next step for a candidate based on their current stage, scores and violations.",
      parameters: {
        type: "object",
        properties: { application_id: { type: "string" } },
        required: ["application_id"],
      },
    },
  },
];

const STAGE_ORDER = ["applied", "aptitude", "video", "technical", "gd", "hr", "offer", "hired"];

// Verifies a job belongs to the caller's company. Returns the job row or null.
async function companyJob(admin: any, companyId: string, jobId: string) {
  const { data } = await admin.from("jobs").select("*").eq("id", jobId).eq("company_id", companyId).maybeSingle();
  return data;
}

// Verifies an application belongs to a job in the caller's company.
async function companyApplication(admin: any, companyId: string, appId: string) {
  const { data } = await admin
    .from("applications")
    .select("*, jobs!inner(id, title, company_id)")
    .eq("id", appId)
    .maybeSingle();
  if (!data || (data as any).jobs?.company_id !== companyId) return null;
  return data;
}

async function runHrTool(
  admin: any,
  companyId: string,
  actorUserId: string,
  name: string,
  args: any,
): Promise<any> {
  switch (name) {
    case "list_jobs": {
      const status = args?.status && args.status !== "any" ? args.status : null;
      const limit = Math.min(Number(args?.limit) || 30, 100);
      let q = admin
        .from("jobs")
        .select("id, title, department, status, applications_count, experience_min, experience_max, skills_required, location, work_type, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) return { error: error.message };
      return { jobs: data };
    }
    case "get_job_candidates": {
      const job = await companyJob(admin, companyId, args.job_id);
      if (!job) return { error: "Job not in your company or not found" };
      const limit = Math.min(Number(args?.limit) || 50, 200);
      let q = admin
        .from("applications")
        .select("id, candidate_id, candidate_name, candidate_email, current_stage, status, test_score, video_score, technical_score, gd_score, hr_score, ai_score, resume_url, created_at, experience_years")
        .eq("job_id", args.job_id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (args?.stage) q = q.eq("current_stage", args.stage);
      if (args?.status) q = q.eq("status", args.status);
      const { data, error } = await q;
      if (error) return { error: error.message };
      return { job: { id: job.id, title: job.title }, candidates: data };
    }
    case "get_candidate_detail": {
      const app: any = await companyApplication(admin, companyId, args.application_id);
      if (!app) return { error: "Application not in your company" };
      const { data: violations } = await admin
        .from("test_violations")
        .select("violation_type, count, created_at")
        .eq("application_id", args.application_id)
        .order("created_at", { ascending: false })
        .limit(20);
      const { data: candUser } = await admin
        .from("users").select("user_id, full_name, email, phone").eq("id", app.candidate_id).maybeSingle();
      let profile: any = null;
      if (candUser?.user_id) {
        const { data } = await admin
          .from("candidate_profiles")
          .select("headline, about_me, skills, experiences, projects, education, linkedin_url, github_url, expected_ctc, current_ctc, completion_percentage")
          .eq("user_id", candUser.user_id)
          .maybeSingle();
        profile = data;
      }
      return { application: app, candidate_user: candUser, violations, profile };
    }
    case "find_candidate": {
      const q = String(args?.query || "").trim();
      if (!q) return { error: "query required" };
      const limit = Math.min(Number(args?.limit) || 20, 50);
      let query = admin
        .from("applications")
        .select("id, candidate_name, candidate_email, current_stage, status, job_id, jobs!inner(id, title, company_id)")
        .eq("jobs.company_id", companyId)
        .or(`candidate_name.ilike.%${q}%,candidate_email.ilike.%${q}%`)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (args?.job_id) query = query.eq("job_id", args.job_id);
      const { data, error } = await query;
      if (error) return { error: error.message };
      return { matches: data };
    }
    case "get_resume_url": {
      const app: any = await companyApplication(admin, companyId, args.application_id);
      if (!app) return { error: "Application not in your company" };
      if (!app.resume_url) return { error: "No resume on file" };
      const path = app.resume_url.includes("/resumes/") ? app.resume_url.split("/resumes/")[1] : app.resume_url;
      const { data, error } = await admin.storage.from("resumes").createSignedUrl(path, 600);
      if (error) return { error: error.message, raw: app.resume_url };
      return { signed_url: data.signedUrl, expires_in_seconds: 600 };
    }
    case "get_interviews": {
      const limit = Math.min(Number(args?.limit) || 30, 100);
      let q = admin
        .from("interviews")
        .select("id, application_id, candidate_id, job_id, round_type, scheduled_date, scheduled_time, duration, mode, meeting_link, status, recommendation, interviewer_name, jobs(title)")
        .eq("company_id", companyId)
        .order("scheduled_date", { ascending: false })
        .limit(limit);
      if (args?.job_id) q = q.eq("job_id", args.job_id);
      if (args?.application_id) q = q.eq("application_id", args.application_id);
      if (args?.status) q = q.eq("status", args.status);
      if (args?.upcoming_only) q = q.gte("scheduled_date", new Date().toISOString().slice(0, 10));
      const { data, error } = await q;
      if (error) return { error: error.message };
      return { interviews: data };
    }
    case "schedule_interview": {
      const app: any = await companyApplication(admin, companyId, args.application_id);
      if (!app) return { error: "Application not in your company" };
      const { data, error } = await admin.from("interviews").insert({
        application_id: app.id,
        candidate_id: app.candidate_id,
        job_id: app.job_id,
        company_id: companyId,
        round_type: args.round_type || "hr_interview",
        interviewer_id: actorUserId,
        interviewer_name: args.interviewer_name || "HR",
        scheduled_date: args.scheduled_date,
        scheduled_time: args.scheduled_time,
        duration: Number(args.duration) || 30,
        mode: args.mode || "video_call",
        meeting_link: args.meeting_link || null,
        notes: args.notes || null,
        status: "scheduled",
      }).select("id").single();
      if (error) return { error: error.message };
      await admin.from("notifications").insert({
        user_id: app.candidate_id,
        title: "Interview Scheduled",
        message: `Your ${args.round_type || "interview"} is set for ${args.scheduled_date} at ${args.scheduled_time}.`,
      });
      return { ok: true, interview_id: data.id };
    }
    case "get_group_discussions": {
      const limit = Math.min(Number(args?.limit) || 20, 50);
      let q = admin
        .from("group_discussions")
        .select("id, job_id, topic, scheduled_date, scheduled_time, duration, status, meeting_link, jobs(title), gd_groups(id, group_name, candidate_ids), gd_scores(candidate_id, overall_gd_score, verdict, ai_feedback)")
        .eq("company_id", companyId)
        .order("scheduled_date", { ascending: false })
        .limit(limit);
      if (args?.job_id) q = q.eq("job_id", args.job_id);
      if (args?.gd_id) q = q.eq("id", args.gd_id);
      const { data, error } = await q;
      if (error) return { error: error.message };
      return { group_discussions: data };
    }
    case "get_offers": {
      const limit = Math.min(Number(args?.limit) || 30, 100);
      let q = admin
        .from("offer_letters")
        .select("id, application_id, candidate_id, job_id, designation, ctc_total, joining_date, accept_by, status, accepted_at, decline_reason, jobs(title)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (args?.status) q = q.eq("status", args.status);
      if (args?.job_id) q = q.eq("job_id", args.job_id);
      if (args?.application_id) q = q.eq("application_id", args.application_id);
      const { data, error } = await q;
      if (error) return { error: error.message };
      return { offers: data };
    }
    case "hire_candidate": {
      const app: any = await companyApplication(admin, companyId, args.application_id);
      if (!app) return { error: "Application not in your company" };
      const { error } = await admin
        .from("applications")
        .update({ status: "hired", current_stage: "hired" })
        .eq("id", args.application_id);
      if (error) return { error: error.message };
      await admin.from("notifications").insert({
        user_id: app.candidate_id,
        title: "🎉 You're Hired!",
        message: `Congratulations! You've been hired for "${app.jobs?.title}".`,
      });
      return { ok: true, application_id: args.application_id, status: "hired" };
    }
    case "get_chat_with_candidate": {
      const app: any = await companyApplication(admin, companyId, args.application_id);
      if (!app) return { error: "Application not in your company" };
      const limit = Math.min(Number(args?.limit) || 40, 100);
      const { data, error } = await admin
        .from("chat_messages")
        .select("id, sender_id, receiver_id, message, is_read, created_at")
        .or(`and(sender_id.eq.${actorUserId},receiver_id.eq.${app.candidate_id}),and(sender_id.eq.${app.candidate_id},receiver_id.eq.${actorUserId})`)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) return { error: error.message };
      return { messages: (data || []).reverse() };
    }
    case "send_chat_to_candidate": {
      const app: any = await companyApplication(admin, companyId, args.application_id);
      if (!app) return { error: "Application not in your company" };
      const { error } = await admin.from("chat_messages").insert({
        sender_id: actorUserId,
        receiver_id: app.candidate_id,
        message: String(args.message || "").slice(0, 4000),
      });
      if (error) return { error: error.message };
      await admin.from("notifications").insert({
        user_id: app.candidate_id,
        title: "New message from HR",
        message: String(args.message || "").slice(0, 200),
      });
      return { ok: true };
    }
    case "suggest_next_action": {
      const app: any = await companyApplication(admin, companyId, args.application_id);
      if (!app) return { error: "Application not in your company" };
      const { data: viol } = await admin
        .from("test_violations")
        .select("violation_type, count")
        .eq("application_id", args.application_id);
      const stage = app.current_stage || "applied";
      const idx = STAGE_ORDER.indexOf(stage);
      const next = STAGE_ORDER[Math.min(idx + 1, STAGE_ORDER.length - 1)];
      const scores = {
        test: app.test_score, video: app.video_score, technical: app.technical_score,
        gd: app.gd_score, hr: app.hr_score, ai: app.ai_score,
      };
      const totalViolations = (viol || []).reduce((s: number, v: any) => s + (v.count || 0), 0);
      return {
        candidate: app.candidate_name,
        current_stage: stage,
        next_stage_if_advanced: next,
        scores,
        total_violations: totalViolations,
        hint: totalViolations > 5
          ? "High violation count — consider reject_candidate."
          : `Based on scores, consider advance_candidate to ${next} or schedule_interview.`,
      };
    }
    case "get_violations": {
      const hours = Number(args?.hours_back) || 24;
      const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
      const limit = Math.min(Number(args?.limit) || 50, 200);
      // Restrict to applications in this company's jobs
      const { data: jobs } = await admin.from("jobs").select("id").eq("company_id", companyId);
      const jobIds = (jobs || []).map((j: any) => j.id);
      if (jobIds.length === 0) return { violations: [] };
      const { data: apps } = await admin.from("applications").select("id, candidate_name, job_id, jobs(title)").in("job_id", jobIds);
      const appMap = new Map((apps || []).map((a: any) => [a.id, a]));
      let q = admin
        .from("test_violations")
        .select("id, application_id, violation_type, count, created_at, details")
        .in("application_id", Array.from(appMap.keys()))
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (args?.job_id) {
        const jobApps = (apps || []).filter((a: any) => a.job_id === args.job_id).map((a: any) => a.id);
        q = admin
          .from("test_violations")
          .select("id, application_id, violation_type, count, created_at, details")
          .in("application_id", jobApps.length ? jobApps : ["00000000-0000-0000-0000-000000000000"])
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(limit);
      }
      const { data, error } = await q;
      if (error) return { error: error.message };
      const enriched = (data || []).map((v: any) => {
        const a: any = appMap.get(v.application_id);
        return { ...v, candidate: a?.candidate_name, job: a?.jobs?.title };
      });
      return { violations: enriched };
    }
    case "get_top_candidates": {
      const limit = Math.min(Number(args?.limit) || 10, 50);
      let q = admin
        .from("applications")
        .select("id, candidate_name, job_id, jobs!inner(id, title, company_id), test_score, video_score, technical_score, gd_score, hr_score, ai_score, current_stage, status")
        .eq("jobs.company_id", companyId);
      if (args?.job_id) q = q.eq("job_id", args.job_id);
      const { data, error } = await q.limit(500);
      if (error) return { error: error.message };
      const scored = (data || []).map((a: any) => {
        const parts = [a.test_score, a.video_score, a.technical_score, a.gd_score, a.hr_score, a.ai_score]
          .map((n) => (typeof n === "number" ? n : null))
          .filter((n): n is number => n !== null);
        const composite = parts.length ? parts.reduce((s, n) => s + n, 0) / parts.length : -1;
        return { ...a, composite_score: Number(composite.toFixed(2)) };
      });
      scored.sort((a: any, b: any) => b.composite_score - a.composite_score);
      return { candidates: scored.slice(0, limit) };
    }
    case "close_job": {
      const job = await companyJob(admin, companyId, args.job_id);
      if (!job) return { error: "Job not in your company" };
      const { error } = await admin.from("jobs").update({ status: "closed" }).eq("id", args.job_id);
      if (error) return { error: error.message };
      return { ok: true, job_id: args.job_id, status: "closed" };
    }
    case "reopen_job": {
      const job = await companyJob(admin, companyId, args.job_id);
      if (!job) return { error: "Job not in your company" };
      const { error } = await admin.from("jobs").update({ status: "open" }).eq("id", args.job_id);
      if (error) return { error: error.message };
      return { ok: true, job_id: args.job_id, status: "open" };
    }
    case "reject_candidate": {
      const app = await companyApplication(admin, companyId, args.application_id);
      if (!app) return { error: "Application not in your company" };
      const { error } = await admin
        .from("applications")
        .update({ status: "rejected", current_stage: "rejected", rejection_reason: args?.reason ?? "Rejected by HR via AI assistant" })
        .eq("id", args.application_id);
      if (error) return { error: error.message };
      await admin.from("notifications").insert({
        user_id: (app as any).candidate_id,
        title: "Application Update",
        message: `Your application for "${(app as any).jobs?.title}" was not selected. ${args?.reason || ""}`.trim(),
      });
      return { ok: true, application_id: args.application_id, status: "rejected" };
    }
    case "advance_candidate": {
      const app = await companyApplication(admin, companyId, args.application_id);
      if (!app) return { error: "Application not in your company" };
      let next = args?.next_stage as string | undefined;
      if (!next) {
        const idx = STAGE_ORDER.indexOf((app as any).current_stage || "applied");
        next = STAGE_ORDER[Math.min(idx + 1, STAGE_ORDER.length - 1)];
      }
      const { error } = await admin
        .from("applications")
        .update({ current_stage: next, status: next === "hired" ? "hired" : "selected" })
        .eq("id", args.application_id);
      if (error) return { error: error.message };
      await admin.from("notifications").insert({
        user_id: (app as any).candidate_id,
        title: "You've moved to the next round",
        message: `You've advanced to ${next} for "${(app as any).jobs?.title}".`,
      });
      return { ok: true, application_id: args.application_id, next_stage: next };
    }
    case "soft_delete_candidate": {
      const app = await companyApplication(admin, companyId, args.application_id);
      if (!app) return { error: "Application not in your company" };
      const { error } = await admin
        .from("applications")
        .update({ status: "deleted" })
        .eq("id", args.application_id);
      if (error) return { error: error.message };
      return { ok: true, application_id: args.application_id, status: "deleted" };
    }
    case "generate_jd": {
      // Just hand the args back; the model will write the JD in its next turn using these.
      return { ok: true, jd_brief: args };
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!LOVABLE_KEY) return json({ error: "GEMINI_API_KEY not configured" }, 500);
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userData } = await admin.auth.getUser(token);
    const authUser = userData?.user;
    if (!authUser) return json({ error: "unauthorized" }, 401);

    const body = await req.json();
    const threadId: string | undefined = body.thread_id;
    const userMessage: string = String(body.message || "").trim();
    const clientMode: Role | undefined = body.mode;
    if (!threadId || !userMessage) return json({ error: "thread_id and message required" }, 400);

    const { data: userRow } = await admin
      .from("users")
      .select("id, full_name, email, role, company_id")
      .eq("user_id", authUser.id)
      .maybeSingle();
    if (!userRow) return json({ error: "user not found" }, 404);

    const role = (userRow.role as Role) || "candidate";
    const isStaff = role === "hr" || role === "manager" || role === "owner" || role === "superadmin";
    // The effective agent persona MUST match the caller's real role.
    // Client may pass `mode` for clarity but we never trust it to escalate.
    const mode: Role = clientMode && clientMode === role ? clientMode : role;
    const useTools = isStaff && !!userRow.company_id;

    const { data: thread } = await admin
      .from("ai_chat_threads")
      .select("id, candidate_id, job_id")
      .eq("id", threadId)
      .maybeSingle();
    if (!thread || thread.candidate_id !== userRow.id) return json({ error: "forbidden" }, 403);

    // ---------------- Build per-role system prompt ----------------
    const today = new Date().toISOString().slice(0, 10);
    let systemInstruction = "";
    if (isStaff) {
      if (!userRow.company_id) {
        systemInstruction = `You are the HireZap AI Assistant for **${userRow.full_name}** (role: ${role}). They have no company on file yet, so live data tools are unavailable. Help with general hiring tasks and JD drafting, and ask them to complete company setup.`;
      } else {
        const personaByRole: Record<Exclude<Role, "candidate">, string> = {
          owner: `You are the **HireZap Owner Platform AI** for **${userRow.full_name}**. You advise the company owner on platform-wide hiring health, growth and ROI. Tools are scoped to their own company only — do NOT speculate about other companies' data. Focus on strategic summaries: pipeline health, conversion across stages, time-to-hire, credit/AI usage hints, and where to invest hiring effort next.`,
          superadmin: `You are the **HireZap Admin Console AI** for **${userRow.full_name}** (Company Admin). You help with company-wide governance: HR/manager coverage, jobs lacking owners, compliance, violations, and team-level performance. Tools are scoped to this company.`,
          hr: `You are the **HireZap HR Recruiter AI** for **${userRow.full_name}**. Operate the day-to-day pipeline: shortlisting, scheduling, candidate outreach, offers, JD drafting. Tools are scoped to this HR's company.`,
          manager: `You are the **HireZap Hiring Manager AI** for **${userRow.full_name}**. Focus on roles and candidates the manager is involved with — shortlists, technical/HR interview decisions, scorecard guidance. Tools are scoped to this company; when listing candidates, prefer those tied to jobs this manager owns when possible.`,
        };
        systemInstruction = `${personaByRole[role as Exclude<Role, "candidate">]}

You have authenticated, company-scoped tool access. PREFER calling a tool over guessing. Tools never leak data from other companies or other users.

Available tools include: list_jobs, get_job_candidates, get_top_candidates, get_candidate_detail, get_violations, get_interviews, get_group_discussions, get_offers, get_chat_with_candidate, get_resume_url, find_candidate, advance_candidate, reject_candidate, hire_candidate, soft_delete_candidate, close_job, reopen_job, schedule_interview, send_chat_to_candidate, suggest_next_action, generate_jd.

STRICT RESPONSE STYLE:
- Reply in plain, natural sentences — like a helpful colleague talking. Short paragraphs only.
- DO NOT output markdown tables, pipe characters, column layouts, ID strings, UUIDs, JSON, or code blocks unless the user explicitly asks for a table or raw data.
- DO NOT dump raw numbers, scores, or stat lists. Mention at most 2-3 key figures inside a sentence (e.g. "You have 12 candidates in technical round, 3 are scoring above 80.").
- Never start a reply with a heading or a bulleted list. Use a sentence first. Bullets are allowed only when the user explicitly asks for a list.
- Refer to people by name, jobs by title. Never expose internal IDs.

SCOPE LOCK (very important):
- You are the assistant for the **${role.toUpperCase()} dashboard only**. Answer only about what this role can see and do on their own dashboard.
- Never describe, summarize, or compare what other roles (owner / admin / hr / hiring manager / candidate) see on their dashboards.
- If asked about another dashboard, briefly say that view belongs to the other role and you can only help with this dashboard.

Other rules:
1. If a user names a candidate/job without an ID, silently resolve it via find_candidate or list_jobs, then act — never show the IDs to the user.
2. For any destructive action (reject, delete, close), confirm in one short sentence what changed.
3. Never reply with "I don't have access" — you do. If a tool fails, explain the failure in one sentence.
4. Today's date: ${today}.`;
      }
    } else {
      // Candidate branch (existing behavior)
      const { data: profile } = await admin
        .from("candidate_profiles")
        .select("headline, about_me, skills, experiences, education, projects, expected_ctc, current_ctc, work_types, completion_percentage")
        .eq("user_id", authUser.id)
        .maybeSingle();

      let jobCtx = "";
      if (thread.job_id) {
        const { data: job } = await admin
          .from("jobs")
          .select("title, department, location, work_type, salary_min, salary_max, experience_min, experience_max, skills_required, job_description, companies(company_name)")
          .eq("id", thread.job_id)
          .maybeSingle();
        const { data: app } = await admin
          .from("applications")
          .select("current_stage, status, test_score")
          .eq("candidate_id", userRow.id)
          .eq("job_id", thread.job_id)
          .maybeSingle();
        if (job) {
          jobCtx = `\nJOB CONTEXT:\nTitle: ${job.title}\nCompany: ${(job as any).companies?.company_name || "—"}\nLocation: ${job.location || "—"} (${job.work_type || "—"})\nExperience: ${job.experience_min ?? 0}-${job.experience_max ?? "+"} yrs\nSkills required: ${(job.skills_required || []).join(", ")}\nDescription: ${(job.job_description || "").slice(0, 1200)}\nCurrent stage: ${app?.current_stage || "not applied"}\nTest score: ${app?.test_score ?? "n/a"}\n`;
        }
      }

      const profileCtx = profile
        ? `\nCANDIDATE PROFILE:\nName: ${userRow.full_name}\nHeadline: ${profile.headline || "—"}\nAbout: ${(profile.about_me || "").slice(0, 600)}\nSkills: ${JSON.stringify(profile.skills || []).slice(0, 600)}\nExperience: ${JSON.stringify(profile.experiences || []).slice(0, 800)}\nProjects: ${JSON.stringify(profile.projects || []).slice(0, 600)}\nExpected CTC: ${profile.expected_ctc || "—"}\nProfile completion: ${profile.completion_percentage || 0}%\n`
        : "";

      systemInstruction = `You are HireZap's AI Career Coach for a candidate (${userRow.full_name}).

STRICT RESPONSE STYLE:
- Talk like a warm, practical mentor. Plain sentences, short paragraphs.
- No markdown tables, no pipe characters, no column layouts, no UUIDs, no JSON, no code blocks unless the user explicitly asks for code.
- Don't dump raw numbers or score lists. Weave at most one or two figures naturally into a sentence.
- Don't start with a heading or bullet list. Use bullets only if the user asks for a list.

SCOPE LOCK:
- You only help this candidate with their own profile, applications, and interview prep on the candidate dashboard.
- Never describe what HR, hiring managers, admin or owner dashboards look like, see, or contain. If asked, say that belongs to the company side and you can only help with the candidate side.
${profileCtx}${jobCtx}`;
    }

    // Save user message + load history
    await admin.from("ai_chat_messages").insert({ thread_id: threadId, role: "user", content: userMessage });
    const { data: history } = await admin
      .from("ai_chat_messages")
      .select("role, content")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(30);

    const messages: any[] = [
      { role: "system", content: systemInstruction },
      ...(history || []).map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    ];
    // The latest user message is already included via history insert above; ensure exactly once
    if (!messages.length || messages[messages.length - 1]?.content !== userMessage) {
      messages.push({ role: "user", content: userMessage });
    }

    // ---------------- Chat loop with optional tool calls ----------------
    let finalReply = "";
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const reqBody: any = {
        model: MODEL,
        messages,
        temperature: 0.4,
        max_tokens: 1400,
      };
      if (useTools) {
        reqBody.tools = HR_TOOLS;
        reqBody.tool_choice = "auto";
      }

      const gemRes = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_KEY}` },
        body: JSON.stringify(reqBody),
      });
      if (!gemRes.ok) {
        const errText = await gemRes.text();
        console.error("AI gateway error", gemRes.status, errText);
        const friendly =
          gemRes.status === 429
            ? "AI is busy right now (rate limited). Please try again shortly."
            : gemRes.status === 402
            ? "AI credits exhausted. Please add credits in your workspace settings."
            : `AI error: ${gemRes.status}`;
        return json({ error: friendly, details: errText.slice(0, 500) }, 502);
      }
      const gemJson = await gemRes.json();
      const msg = gemJson?.choices?.[0]?.message;
      if (!msg) {
        finalReply = "Sorry, I couldn't generate a response right now.";
        break;
      }

      const toolCalls = msg.tool_calls || [];
      if (toolCalls.length > 0 && useTools) {
        // Push the assistant tool-call turn
        messages.push({
          role: "assistant",
          content: msg.content ?? "",
          tool_calls: toolCalls,
        });
        // Execute each tool, append tool result messages
        for (const tc of toolCalls) {
          let parsed: any = {};
          try { parsed = JSON.parse(tc.function?.arguments || "{}"); } catch { /* noop */ }
          const result = await runHrTool(admin, userRow.company_id!, userRow.id, tc.function?.name, parsed);
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify(result).slice(0, 12000),
          });
        }
        continue; // let the model use the tool outputs
      }

      finalReply = msg.content || "(no reply)";
      break;
    }

    if (!finalReply) finalReply = "I ran several tool calls but didn't finalize a reply — please re-ask.";

    await admin.from("ai_chat_messages").insert({ thread_id: threadId, role: "assistant", content: finalReply });
    await admin.from("ai_chat_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);

    return json({ reply: finalReply, mode });
  } catch (e) {
    console.error("ai-assistant-chat error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
