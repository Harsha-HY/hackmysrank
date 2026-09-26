import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { sendStageEmail, type StageEmailBody } from "../_shared/stage-email.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Events a candidate may trigger about their own application.
const CANDIDATE_EVENTS = new Set(["round_submitted"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const { data: caller } = await userClient
      .from("users").select("id, full_name, role, company_id").eq("user_id", user.id).maybeSingle();
    if (!caller) return json({ error: "forbidden" }, 403);

    const body = (await req.json()) as StageEmailBody;
    if (!body?.applicationId || !body?.event) return json({ error: "applicationId and event required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: app } = await admin
      .from("applications").select("id, candidate_id, job_id").eq("id", body.applicationId).maybeSingle();
    if (!app) return json({ error: "application not found" }, 404);

    const isStaff = ["hr", "manager", "owner", "superadmin"].includes(caller.role);
    if (isStaff) {
      const { data: job } = await admin.from("jobs").select("company_id").eq("id", app.job_id).maybeSingle();
      if (job?.company_id && caller.company_id && job.company_id !== caller.company_id) {
        return json({ error: "forbidden" }, 403);
      }
    } else {
      // Candidate: only their own application, and only self-service events.
      if (app.candidate_id !== caller.id || !CANDIDATE_EVENTS.has(body.event)) {
        return json({ error: "forbidden" }, 403);
      }
    }

    const res = await sendStageEmail(admin, body, isStaff ? caller.full_name : undefined);
    if (!res.ok) return json({ error: res.error }, res.status || 500);
    return json({ ok: true, skipped: res.skipped });
  } catch (e) {
    console.error(e);
    return json({ error: String(e instanceof Error ? e.message : e) }, 500);
  }
});
