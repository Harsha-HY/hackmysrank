import { supabase } from "@/integrations/supabase/client";

export type StageEvent =
  | "application_received"
  | "aptitude_passed"
  | "aptitude_failed"
  | "video_selected"
  | "video_rejected"
  | "technical_selected"
  | "technical_rejected"
  | "gd_selected"
  | "gd_rejected"
  | "hr_selected"
  | "hr_rejected"
  | "offer_sent"
  | "offer_accepted"
  | "offer_declined"
  | "hired";

const COPY: Record<StageEvent, { subject: string; heading: string; body: (ctx: Ctx) => string; cta?: { label: string; url: string } }> = {
  application_received: { subject: "Application received", heading: "We received your application", body: (c) => `Hi ${c.name},\n\nThanks for applying to the ${c.job} role. Our team will review your profile and get back to you soon.\n\nGood luck!` },
  aptitude_passed: { subject: "You cleared the Aptitude Round", heading: "Aptitude Round — Cleared", body: (c) => `Congratulations ${c.name}!\n\nYou cleared the aptitude round for ${c.job}. The next stage (Video Introduction) is now unlocked in your dashboard.` },
  aptitude_failed: { subject: "Aptitude Round update", heading: "Aptitude Round — Not cleared", body: (c) => `Hi ${c.name},\n\nThank you for taking the aptitude round for ${c.job}. Unfortunately you did not meet the cutoff this time. We wish you the very best for your future applications.` },
  video_selected: { subject: "Shortlisted from Video Round", heading: "Video Round — Selected", body: (c) => `Great news ${c.name}!\n\nYour video introduction stood out. You're moving forward to the Technical Round for ${c.job}. Please check your dashboard for instructions.` },
  video_rejected: { subject: "Video Round update", heading: "Video Round — Not selected", body: (c) => `Hi ${c.name},\n\nThanks for sharing your video introduction for ${c.job}. After review, we won't be moving forward this time. We appreciate your effort and wish you success ahead.` },
  technical_selected: { subject: "Shortlisted from Technical Round", heading: "Technical Round — Selected", body: (c) => `Well done ${c.name}!\n\nYou've cleared the technical round for ${c.job} and are moving to the Group Discussion stage. Details will appear on your dashboard.` },
  technical_rejected: { subject: "Technical Round update", heading: "Technical Round — Not selected", body: (c) => `Hi ${c.name},\n\nThank you for completing the technical round for ${c.job}. We won't be progressing your application further this time. Wishing you the best ahead.` },
  gd_selected: { subject: "Shortlisted from Group Discussion", heading: "Group Discussion — Selected", body: (c) => `Congratulations ${c.name}!\n\nYou've been shortlisted from the group discussion for ${c.job}. The HR round is the next step — check your dashboard.` },
  gd_rejected: { subject: "Group Discussion update", heading: "Group Discussion — Not selected", body: (c) => `Hi ${c.name},\n\nThanks for participating in the group discussion for ${c.job}. We won't be progressing further this time. We appreciate your time and effort.` },
  hr_selected: { subject: "Shortlisted after HR Round", heading: "HR Round — Selected", body: (c) => `Excellent ${c.name}!\n\nYou've cleared the HR round for ${c.job}. An offer letter will be issued shortly — please watch your dashboard.` },
  hr_rejected: { subject: "HR Round update", heading: "HR Round — Not selected", body: (c) => `Hi ${c.name},\n\nThank you for the HR conversation for ${c.job}. We've decided not to move ahead this time. Wishing you continued success.` },
  offer_sent: { subject: "Your offer letter is ready", heading: "Offer Letter — Ready to review", body: (c) => `Congratulations ${c.name}!\n\nYour offer letter for ${c.job} is now available on your HireZap dashboard. Please review the details and respond at your convenience.` },
  offer_accepted: { subject: "Offer accepted", heading: "Offer Accepted", body: (c) => `Hi ${c.name},\n\nWe've recorded your acceptance for ${c.job}. Onboarding details and BGV documents will follow on your dashboard.` },
  offer_declined: { subject: "Offer declined", heading: "Offer Declined", body: (c) => `Hi ${c.name},\n\nWe've recorded that you've declined the offer for ${c.job}. Thank you for your time — we wish you the best.` },
  hired: { subject: "Welcome to the team", heading: "You're Hired!", body: (c) => `Welcome aboard ${c.name}!\n\nAll onboarding steps for ${c.job} are complete. Your HR team will reach out with next steps shortly.` },
};

interface Ctx { name: string; job: string; }

export async function notifyCandidate(opts: {
  userId: string;        // public.users.id
  authEmail?: string;    // override
  event: StageEvent;
  candidateName: string;
  jobTitle: string;
}) {
  const copy = COPY[opts.event];
  const ctx: Ctx = { name: opts.candidateName || "there", job: opts.jobTitle || "the role" };

  // 1) In-app notification
  try {
    await supabase.from("notifications").insert({
      user_id: opts.userId,
      title: copy.heading,
      message: copy.body(ctx).split("\n").slice(0, 2).join(" "),
    });
  } catch (e) { console.warn("notif insert failed", e); }

  // 2) Email via Resend (fire and forget)
  try {
    let email = opts.authEmail;
    if (!email) {
      const { data } = await supabase.from("users").select("email").eq("id", opts.userId).maybeSingle();
      email = data?.email;
    }
    if (email) {
      await supabase.functions.invoke("send-email", {
        body: { to: email, subject: copy.subject, heading: copy.heading, body: copy.body(ctx) },
      });
    }
  } catch (e) { console.warn("email send failed", e); }
}
