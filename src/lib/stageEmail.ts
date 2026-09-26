import { supabase } from "@/integrations/supabase/client";

export type StageEmailEvent =
  | "shortlisted"
  | "round_submitted"
  | "round_cleared"
  | "round_scheduled"
  | "rejected"
  | "auto_rejected"
  | "offer_sent"
  | "hired";

export interface StageEmailArgs {
  applicationId: string;
  event: StageEmailEvent;
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

/** Fire-and-forget professional email to the candidate (company + HR name + timings). */
export function sendStageEmail(args: StageEmailArgs) {
  supabase.functions
    .invoke("send-stage-email", { body: args })
    .then(({ error }) => { if (error) console.warn("stage email failed", error); })
    .catch((e) => console.warn("stage email failed", e));
}
