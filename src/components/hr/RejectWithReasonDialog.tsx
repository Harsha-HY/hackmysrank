import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { sendStageEmail } from "@/lib/stageEmail";
import { Loader2 } from "@/components/BrandLoader";

interface App {
  id: string;
  candidate_id: string;
  candidate_name?: string;
  job_id: string;
  job_title?: string;
  current_stage: string;
  resume_score?: number | null;
  test_score?: number | null;
  video_score?: number | null;
  technical_score?: number | null;
  gd_score?: number | null;
  interview_score?: number | null;
  ai_analysis?: any;
}

interface Props {
  app: App | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRejected: (appId: string, reason: string) => void;
}

export default function RejectWithReasonDialog({ app, open, onOpenChange, onRejected }: Props) {
  const [reason, setReason] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open || !app) return;
    setReason("");
    void fetchSuggestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, app?.id]);

  const fetchSuggestion = async () => {
    if (!app) return;
    setLoadingAi(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-rejection-reason", {
        body: {
          candidateName: app.candidate_name,
          jobTitle: app.job_title,
          stage: app.current_stage,
          resumeScore: app.resume_score,
          aptitudeScore: app.test_score,
          videoScore: app.video_score,
          technicalScore: app.technical_score,
          gdScore: app.gd_score,
          interviewScore: app.interview_score,
          matchedSkills: app.ai_analysis?.matched_skills || [],
          missingSkills: app.ai_analysis?.missing_skills || [],
        },
      });
      if (error) throw error;
      if (data?.reason) setReason(data.reason);
    } catch (e: any) {
      toast({ title: "AI suggestion failed", description: e.message, variant: "destructive" });
    } finally {
      setLoadingAi(false);
    }
  };

  const submit = async () => {
    if (!app || !reason.trim()) {
      toast({ title: "Reason required", description: "Please write or accept a rejection reason.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("applications")
        .update({
          current_stage: "rejected",
          status: "rejected",
          rejection_stage: app.current_stage,
          rejection_reason: reason.trim(),
        } as any)
        .eq("id", app.id);
      if (error) throw error;

      await supabase.from("notifications").insert({
        user_id: app.candidate_id,
        title: "Application Update",
        message: `Regarding your application for ${app.job_title || "the role"}: ${reason.trim()}\n\nWe appreciate your interest and wish you the best in your future endeavors.`,
      });

      sendStageEmail({
        applicationId: app.id,
        event: "rejected",
        stage: app.current_stage,
        reason: reason.trim(),
      });

      onRejected(app.id, reason.trim());
      onOpenChange(false);
      toast({ title: "Candidate rejected", description: "Reason saved and candidate notified." });
    } catch (e: any) {
      toast({ title: "Reject failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><XCircle className="h-5 w-5 text-destructive" /> Reject Candidate</DialogTitle>
          <DialogDescription>
            {app?.candidate_name} at stage <strong>{app?.current_stage.replace(/_/g, " ")}</strong>. The reason below will be shared with the candidate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">AI-suggested reason</span>
            <Button size="sm" variant="ghost" onClick={fetchSuggestion} disabled={loadingAi} className="gap-1 text-xs">
              {loadingAi ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              Regenerate
            </Button>
          </div>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={loadingAi ? "Drafting a reason..." : "Write a reason or regenerate the AI suggestion."}
            rows={6}
            disabled={loadingAi}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button variant="destructive" onClick={submit} disabled={submitting || loadingAi || !reason.trim()} className="gap-2">
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Reject & Notify
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
