import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the calling user is a superadmin or owner
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callingUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !callingUser) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check caller's role
    const { data: callerData } = await userClient
      .from("users")
      .select("role, company_id")
      .eq("user_id", callingUser.id)
      .maybeSingle();

    if (!callerData || !["owner", "superadmin"].includes(callerData.role)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, fullName, phone, role, companyId: bodyCompanyId, department } = await req.json();

    if (!email || !password || !fullName || !role) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine the companyId:
    // - For owner (platform admin), we allow using the companyId passed in the body.
    // - For superadmin (company admin), we force it to the caller's company_id for security.
    let companyId = callerData.company_id;
    if (callerData.role === "owner" && bodyCompanyId) {
      companyId = bodyCompanyId;
    }

    if (!companyId) {
      return new Response(JSON.stringify({ error: "A company ID must be assigned" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Role whitelist based on caller role
    const ALLOWED: Record<string, string[]> = {
      owner: ["hr", "manager", "superadmin"],
      superadmin: ["hr", "manager"],
    };
    const allowed = ALLOWED[callerData.role] || [];
    if (!allowed.includes(role)) {
      return new Response(JSON.stringify({ error: `Role '${role}' not permitted for your account` }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    // Use service role client to create the user without affecting the caller's session
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone: phone || "", role },
    });

    if (createError || !newUser.user) {
      return new Response(JSON.stringify({ error: createError?.message || "Failed to create auth user" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // The auth trigger handle_new_candidate_user may have already inserted a row
    // with the default role. Upsert by user_id to set the correct role/company.
    const upsertData: Record<string, unknown> = {
      user_id: newUser.user.id,
      full_name: fullName,
      email,
      phone: phone || null,
      role,
      company_id: companyId,
    };
    if (department) upsertData.department = department;

    // Try update first (handles trigger-created row), fall back to insert.
    const { data: updated, error: updateError } = await adminClient
      .from("users")
      .update({
        full_name: fullName,
        phone: phone || null,
        role,
        company_id: companyId,
        ...(department ? { department } : {}),
      })
      .eq("user_id", newUser.user.id)
      .select("id")
      .maybeSingle();

    if (updateError) {
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!updated) {
      const { error: insertError } = await adminClient.from("users").insert(upsertData);
      if (insertError) {
        await adminClient.auth.admin.deleteUser(newUser.user.id);
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ success: true, userId: newUser.user.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
