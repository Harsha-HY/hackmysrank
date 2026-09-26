import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FROM = "HireZap <onboarding@resend.dev>";

interface Payload {
  to: string;
  subject: string;
  heading: string;
  body: string;
  cta?: { label: string; url: string };
}

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function escUrl(s: unknown): string {
  const v = String(s ?? "");
  return /^https?:\/\//i.test(v) ? esc(v) : "#";
}

function html(p: Payload) {
  const cta = p.cta
    ? `<p style="margin:28px 0 0"><a href="${escUrl(p.cta.url)}" style="background:#111;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;display:inline-block;font-size:14px">${esc(p.cta.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f6f3ec;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:14px;padding:32px;border:1px solid #ececec">
    <div style="font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#888;margin-bottom:16px">HireZap</div>
    <h1 style="font-family:'Instrument Serif',Georgia,serif;font-size:28px;line-height:1.2;margin:0 0 16px">${esc(p.heading)}</h1>
    <div style="font-size:15px;line-height:1.65;color:#333;white-space:pre-line">${esc(p.body)}</div>
    ${cta}
    <hr style="border:none;border-top:1px solid #eee;margin:32px 0 16px"/>
    <div style="font-size:12px;color:#999">Sent by HireZap · Smart Hiring Studio</div>
  </div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");

    // Auth: require authenticated staff
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: caller } = await userClient.from("users").select("role").eq("user_id", user.id).maybeSingle();
    if (!caller || !["hr", "manager", "owner", "superadmin"].includes(caller.role)) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const payload = (await req.json()) as Payload;
    if (!payload?.to || !payload?.subject || !payload?.heading || !payload?.body) {
      return new Response(JSON.stringify({ error: "to, subject, heading, body required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (typeof payload.subject !== "string" || payload.subject.length > 200) {
      return new Response(JSON.stringify({ error: "invalid subject" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Restrict 'to' to a known user email in the database
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: target } = await admin.from("users").select("email").ilike("email", payload.to).maybeSingle();
    if (!target) {
      return new Response(JSON.stringify({ error: "recipient is not a registered user" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [target.email],
        subject: payload.subject,
        html: html(payload),
      }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(data));
    return new Response(JSON.stringify({ ok: true, data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e instanceof Error ? e.message : e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
