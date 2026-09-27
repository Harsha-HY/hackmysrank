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

    // Verify caller using service client
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user: callingUser }, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !callingUser) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check caller's role from users table with fallback to auth metadata
    const { data: callerData } = await adminClient
      .from("users")
      .select("role, company_id")
      .eq("user_id", callingUser.id)
      .maybeSingle();

    const callerRole = (callerData?.role || callingUser.user_metadata?.role || callingUser.app_metadata?.role || "").toLowerCase();

    if (!["owner", "superadmin"].includes(callerRole)) {
      return new Response(JSON.stringify({ error: "Unauthorized: only owners or superadmins can create accounts" }), {
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
    // Allow bodyCompanyId when provided, or fall back to caller company
    const companyId = bodyCompanyId || callerData?.company_id || callingUser.user_metadata?.company_id;

    if (!companyId) {
      return new Response(JSON.stringify({ error: "A company ID must be assigned" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Role whitelist based on caller role
    const ALLOWED: Record<string, string[]> = {
      owner: ["hr", "manager", "superadmin"],
      superadmin: ["hr", "manager", "superadmin"],
    };
    const allowed = ALLOWED[callerRole] || [];
    if (!allowed.includes(role)) {
      return new Response(JSON.stringify({ error: `Role '${role}' not permitted for your account` }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let targetUserId: string;

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone: phone || "", role, company_id: companyId },
    });

    if (createError || !newUser?.user) {
      // Check if user already exists
      if (createError && /already been registered|already exists/i.test(createError.message)) {
        const { data: userList } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
        const existing = userList?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
        if (existing) {
          targetUserId = existing.id;
          await adminClient.auth.admin.updateUserById(existing.id, {
            password,
            user_metadata: {
              ...(existing.user_metadata || {}),
              full_name: fullName,
              phone: phone || "",
              role,
              company_id: companyId,
            },
          });
        } else {
          return new Response(JSON.stringify({ error: createError.message }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        return new Response(JSON.stringify({ error: createError?.message || "Failed to create auth user" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      targetUserId = newUser.user.id;
    }

    // Upsert into public.users with elevated service role
    const upsertData: Record<string, unknown> = {
      user_id: targetUserId,
      full_name: fullName,
      email,
      phone: phone || null,
      role,
      company_id: companyId,
    };
    if (department) upsertData.department = department;

    const { data: updated, error: updateError } = await adminClient
      .from("users")
      .update({
        full_name: fullName,
        phone: phone || null,
        role,
        company_id: companyId,
        ...(department ? { department } : {}),
      })
      .eq("user_id", targetUserId)
      .select("id")
      .maybeSingle();

    if (!updated && !updateError) {
      const { error: insertError } = await adminClient.from("users").insert(upsertData);
      if (insertError) {
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, userId: targetUserId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
