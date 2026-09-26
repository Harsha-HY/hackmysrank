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
    const { applicationId, candidateId } = await req.json();
    if (!applicationId || !candidateId) {
      return new Response(JSON.stringify({ error: "Missing applicationId or candidateId" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: candidate } = await supabase.from("users").select("full_name, email, user_id").eq("id", candidateId).single();
    if (!candidate) {
      return new Response(JSON.stringify({ error: "Candidate not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: application } = await supabase.from("applications").select("job_id").eq("id", applicationId).single();
    let jobTitle = "the position";
    let companyName = "our company";
    if (application) {
      const { data: job } = await supabase.from("jobs").select("title, company_id").eq("id", application.job_id).single();
      if (job) {
        // Verify caller's company owns this job
        if (job.company_id !== caller.company_id) {
          return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        jobTitle = job.title;
        const { data: company } = await supabase.from("companies").select("company_name").eq("id", job.company_id).single();
        if (company) companyName = company.company_name;
      }
    }

    await supabase.from("notifications").insert({
      user_id: candidateId,
      title: "📧 Hire Confirmation Sent",
      message: `Dear ${candidate.full_name}, This is to confirm that you have been officially hired for the position of ${jobTitle} at ${companyName}. Please check your registered email (${candidate.email}) for further onboarding instructions. Congratulations and welcome to the team!`,
    });

    return new Response(JSON.stringify({ success: true, email: candidate.email }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
