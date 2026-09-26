import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth: staff only, and application must belong to caller's company
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: caller } = await userClient.from("users").select("role, company_id").eq("user_id", user.id).maybeSingle();
    if (!caller || !["hr", "manager", "owner", "superadmin"].includes(caller.role)) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { applicationId } = await req.json();
    if (!applicationId) {
      return new Response(JSON.stringify({ error: "Missing applicationId" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: app } = await supabase
      .from("applications")
      .select("resume_url, video_url, photo_url, candidate_id, job_id, jobs:job_id(company_id)")
      .eq("id", applicationId)
      .single();

    if (!app) {
      return new Response(JSON.stringify({ error: "Application not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const appCompanyId = (app as any).jobs?.company_id;
    if (!appCompanyId || appCompanyId !== caller.company_id) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const deleted: string[] = [];
    if (app.resume_url && !app.resume_url.startsWith("http")) {
      const { error } = await supabase.storage.from("resumes").remove([app.resume_url]);
      if (!error) deleted.push("resume");
    }
    if (app.video_url) {
      const { error } = await supabase.storage.from("videos").remove([app.video_url]);
      if (!error) deleted.push("video");
    }
    if (app.photo_url && !app.photo_url.startsWith("http")) {
      const { error } = await supabase.storage.from("photos").remove([app.photo_url]);
      if (!error) deleted.push("photo");
    }

    await supabase.from("applications").update({ resume_url: null, video_url: null, photo_url: null }).eq("id", applicationId);

    return new Response(JSON.stringify({ success: true, deleted }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
