import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not authenticated" }, 401);

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: authError } = await userClient.auth.getUser();
    if (authError || !caller) return json({ error: "Not authenticated" }, 401);

    const { data: callerRow } = await userClient
      .from("users")
      .select("role")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (!callerRow || callerRow.role !== "owner") return json({ error: "Unauthorized" }, 403);

    const { companyId } = await req.json();
    if (!companyId) return json({ error: "companyId is required" }, 400);

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Only staff accounts belonging to this company are removed. Candidates are untouched.
    const { data: staff, error: staffErr } = await admin
      .from("users")
      .select("id, user_id, role")
      .eq("company_id", companyId)
      .in("role", ["superadmin", "hr", "manager"]);

    if (staffErr) return json({ error: staffErr.message }, 400);

    let removed = 0;
    for (const s of staff || []) {
      await admin.from("users").delete().eq("id", s.id);
      if (s.user_id && s.user_id !== caller.id) {
        const { error: delErr } = await admin.auth.admin.deleteUser(s.user_id);
        if (!delErr) removed++;
      }
    }

    return json({ success: true, removed });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
