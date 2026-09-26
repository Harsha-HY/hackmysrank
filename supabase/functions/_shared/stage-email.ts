// Shared professional candidate email builder + sender (Resend).
// Used by the send-stage-email endpoint and by server-side automations.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
// Override with a verified-domain sender once the domain is set up, e.g.
// RESEND_FROM = "HireZap <careers@yourdomain.com>"
const FROM = Deno.env.get("RESEND_FROM") || "HireZap <onboarding@resend.dev>";


export type StageEvent =
  | "shortlisted"
  | "round_submitted"
  | "round_cleared"
  | "round_scheduled"
  | "rejected"
  | "auto_rejected"
  | "offer_sent"
  | "hired";

export interface StageEmailBody {
  applicationId: string;
  event: StageEvent;
  stage?: string;
  nextStage?: string;
  reason?: string;
  score?: number | string | null;
  cutoff?: number | string | null;
  topic?: string;
  scheduledAt?: string;
  durationMins?: number;
  mode?: string;
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export const pretty = (s?: string) =>
  (s || "").replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()).trim();

function shell(opts: {
  company: string; heading: string; intro: string;
  rows: Array<[string, string]>; outro: string; hr: string; accent: string;
}) {
  const rows = opts.rows.filter(([, v]) => v).map(
    ([k, v]) =>
      `<tr><td style="padding:8px 0;color:#6b7280;font-size:13px;width:45%">${esc(k)}</td>
        <td style="padding:8px 0;color:#111827;font-size:13px;font-weight:600">${esc(v)}</td></tr>`,
  ).join("");
  return `<!doctype html><html><body style="margin:0;background:#f5f7f6;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
  <div style="max-width:580px;margin:32px auto;background:#fff;border-radius:16px;border:1px solid #e8ebe9;overflow:hidden">
    <div style="height:5px;background:${opts.accent}"></div>
    <div style="padding:34px">
      <div style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#9aa3a0;margin-bottom:14px">${esc(opts.company)}</div>
      <h1 style="font-size:25px;line-height:1.25;margin:0 0 14px;color:#0f1a16">${esc(opts.heading)}</h1>
      <div style="font-size:15px;line-height:1.7;color:#374151;white-space:pre-line">${esc(opts.intro)}</div>
      ${rows ? `<table style="width:100%;border-collapse:collapse;margin:22px 0;border-top:1px solid #eef1ef">${rows}</table>` : "<div style='height:18px'></div>"}
      <div style="font-size:14px;line-height:1.7;color:#4b5563;white-space:pre-line">${esc(opts.outro)}</div>
      <p style="margin:26px 0 0;font-size:14px;color:#111827">Warm regards,<br/><strong>${esc(opts.hr)}</strong><br/>
        <span style="color:#6b7280">Talent Acquisition · ${esc(opts.company)}</span></p>
      <hr style="border:none;border-top:1px solid #eef1ef;margin:28px 0 14px"/>
      <div style="font-size:11px;color:#9aa3a0">Sent via HireZap. This is an automated message about your application.</div>
    </div>
  </div></body></html>`;
}

/**
 * Builds and sends the stage email. `admin` must be a service-role client.
 * Returns { ok, error?, status? } — never throws.
 */
export async function sendStageEmail(
  admin: SupabaseClient,
  b: StageEmailBody,
  senderName?: string,
): Promise<{ ok: boolean; error?: string; status?: number; skipped?: string }> {
  try {
    if (!RESEND_API_KEY) return { ok: false, error: "RESEND_API_KEY missing" };

    const { data: app } = await admin
      .from("applications")
      .select("id, candidate_id, job_id")
      .eq("id", b.applicationId).maybeSingle();
    if (!app) return { ok: false, error: "application not found", status: 404 };

    const [{ data: cand }, { data: job }] = await Promise.all([
      admin.from("users").select("full_name, email").eq("id", app.candidate_id).maybeSingle(),
      admin.from("jobs").select("title, company_id").eq("id", app.job_id).maybeSingle(),
    ]);
    if (!cand?.email) return { ok: false, error: "candidate email not found", status: 404 };
    const { data: comp } = job?.company_id
      ? await admin.from("companies").select("company_name").eq("id", job.company_id).maybeSingle()
      : { data: null as any };

    const name = cand.full_name || "there";
    const role = job?.title || "the role";
    const company = comp?.company_name || "HireZap";
    const hr = senderName || "Talent Acquisition Team";
    const stage = pretty(b.stage);
    const next = pretty(b.nextStage);
    const scoreStr = b.score != null && b.score !== "" ? String(b.score) : "";

    const baseRows: Array<[string, string]> = [
      ["Position", role],
      ["Company", company],
      ["Round", stage],
    ];

    let subject = "", heading = "", intro = "", outro = "", accent = "#10b981";
    let rows: Array<[string, string]> = baseRows;

    switch (b.event) {
      case "shortlisted":
        subject = `Shortlisted — ${next || "next round"} for ${role} at ${company}`;
        heading = "You've been shortlisted";
        intro = `Hi ${name},\n\nGreat news — after reviewing your ${stage || "application"} for the ${role} position, our hiring team has moved you forward in the process.`;
        rows = [...baseRows, ["Next round", next], ["Score", scoreStr]];
        outro = `Your next round is now unlocked on your HireZap dashboard. Please complete it at the earliest.`;
        break;
      case "round_submitted":
        subject = `${stage || "Round"} received — ${role} at ${company}`;
        heading = `We've received your ${stage || "submission"}`;
        intro = `Hi ${name},\n\nThank you — your ${stage || "round"} submission for the ${role} position has been recorded successfully.`;
        rows = [...baseRows, ["Score", scoreStr], ["Submitted", new Date().toLocaleString("en-IN")]];
        outro = `Our hiring team will review it and share the outcome on your dashboard and by email. No action is needed from you right now.`;
        accent = "#6366f1";
        break;
      case "round_cleared":
        subject = `${stage || "Round"} cleared — ${role} at ${company}`;
        heading = `${stage || "Round"} — Cleared`;
        intro = `Hi ${name},\n\nCongratulations! You have successfully cleared the ${stage || "current"} round for the ${role} position.`;
        rows = [...baseRows, ["Score", scoreStr], ["Next round", next]];
        outro = `Please log in to your dashboard to view feedback and begin the next step.`;
        break;
      case "round_scheduled":
        subject = `${stage || "Interview"} scheduled — ${role} at ${company}`;
        heading = `Your ${stage || "interview"} is scheduled`;
        intro = `Hi ${name},\n\nYour ${stage || "interview"} for the ${role} position has been scheduled. Please join on time from your dashboard.`;
        rows = [
          ...baseRows,
          ["Topic", b.topic || ""],
          ["Date & time", b.scheduledAt || ""],
          ["Duration", b.durationMins ? `${b.durationMins} minutes` : ""],
          ["Mode", pretty(b.mode)],
          ["Interviewer", senderName || ""],
        ];
        outro = `Join from your HireZap dashboard — the meeting room opens there 10 minutes before the scheduled time. Keep your camera, microphone and a stable connection ready.`;
        accent = "#0ea5e9";
        break;
      case "auto_rejected":
        subject = `Update on your ${stage || "application"} — ${role} at ${company}`;
        heading = "Application update";
        intro = `Hi ${name},\n\nThank you for completing the ${stage || "round"} for the ${role} position. Unfortunately your result did not meet the qualifying criteria for this role, so we will not be moving forward at this stage.`;
        rows = [
          ...baseRows,
          ["Your score", scoreStr],
          ["Required cutoff", b.cutoff != null ? String(b.cutoff) : ""],
        ];
        outro = `This is an automated outcome based on the round's qualifying score. Your profile remains in our talent pool, and you're welcome to apply for other roles at ${company}.`;
        accent = "#94a3b8";
        break;
      case "rejected":
        subject = `Update on your application — ${role} at ${company}`;
        heading = "Application update";
        intro = `Hi ${name},\n\nThank you for the time and effort you invested in the ${role} process at ${company}. After careful consideration we will not be moving forward with your application at this stage.`;
        rows = [...baseRows, ["Reason", b.reason || ""]];
        outro = `This decision reflects the requirements of this specific role and not your overall potential. Your profile stays in our talent pool, and we'd genuinely welcome an application from you for future openings.`;
        accent = "#94a3b8";
        break;
      case "offer_sent":
        subject = `Your offer letter — ${role} at ${company}`;
        heading = "Your offer letter is ready";
        intro = `Hi ${name},\n\nCongratulations! Following your successful rounds, we're delighted to extend an offer for the ${role} position at ${company}.`;
        rows = baseRows;
        outro = `Your offer letter is available on your dashboard. Please review the details and accept, negotiate or decline before the response deadline.`;
        accent = "#d4af37";
        break;
      case "hired":
        subject = `Welcome to ${company}!`;
        heading = "Welcome aboard 🎉";
        intro = `Hi ${name},\n\nIt's official — you're joining ${company} as ${role}. The whole team is excited to have you.`;
        rows = baseRows;
        outro = `Onboarding steps and document verification will appear on your dashboard shortly.`;
        accent = "#d4af37";
        break;
      default:
        return { ok: false, error: "unknown event", status: 400 };
    }

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [cand.email],
        subject,
        html: shell({ company, heading, intro, rows, outro, hr, accent }),
      }),
    });
    if (!r.ok) {
      const details = await r.text();
      console.error("resend failed", r.status, details);
      // Resend sandbox mode: no verified domain yet, so only the account owner
      // can receive mail. Don't fail the caller's action over this.
      if (r.status === 403 && details.includes("verify a domain")) {
        return { ok: true, skipped: "resend_domain_unverified" };
      }
      return { ok: false, error: details, status: r.status };
    }
    return { ok: true };

  } catch (e) {
    console.error("sendStageEmail failed", e);
    return { ok: false, error: String(e instanceof Error ? e.message : e), status: 500 };
  }
}
