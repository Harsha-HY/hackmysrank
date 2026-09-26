import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const cronSecret = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret") || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!cronSecret || provided !== cronSecret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data: due, error: dueErr } = await supabase
      .from("scheduled_messages")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .limit(200);

    if (dueErr) throw dueErr;

    const results: any[] = [];
    for (const row of due ?? []) {
      const { data: inserted, error: insErr } = await supabase
        .from("chat_messages")
        .insert({
          sender_id: row.sender_id,
          receiver_id: row.receiver_id,
          message: row.message,
          was_scheduled: true,
        })
        .select("id")
        .single();

      if (insErr) {
        await supabase
          .from("scheduled_messages")
          .update({ status: "failed", error: insErr.message })
          .eq("id", row.id);
        results.push({ id: row.id, ok: false, error: insErr.message });
        continue;
      }

      await supabase
        .from("scheduled_messages")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          delivered_message_id: inserted!.id,
        })
        .eq("id", row.id);

      await supabase.from("notifications").insert({
        user_id: row.receiver_id,
        title: "💬 New message",
        message: row.message.substring(0, 80),
      });

      results.push({ id: row.id, ok: true });
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
