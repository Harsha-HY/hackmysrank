import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import VideoMeetingRoom from "@/components/VideoMeetingRoom";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "@/components/BrandLoader";

export default function InterviewRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [interview, setInterview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      const { data: me } = await supabase.from("users").select("id, full_name, role").eq("user_id", session.user.id).maybeSingle();
      if (!me) return;
      setUserName(me.full_name);

      const { data: iv } = await supabase.from("interviews").select("*").eq("id", id).maybeSingle();
      if (!iv) { toast({ title: "Interview not found", variant: "destructive" }); navigate(-1); return; }
      setInterview(iv);

      // Everyone (candidate or interviewer) asks the backend for the room.
      // It reuses the existing live room, or creates one and saves it so the
      // other side gets the exact same meeting — like Meet/Zoom.
      const { data, error } = await supabase.functions.invoke("create-video-room", {
        body: { interviewId: id, appOrigin: window.location.origin },
      });

      const errMsg = (error as any)?.message || data?.error;
      if (errMsg || !data?.meetingId || !data?.token) {
        toast({
          title: "Could not open the meeting room",
          description: String(errMsg || "The video provider did not return a room. Please try again."),
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setMeetingId(data.meetingId);
      setToken(data.token);
      setLoading(false);
    })();
  }, [id]);

  const logViolation = async (type: string, detail?: string) => {
    if (!interview) return;
    try {
      await supabase.from("test_violations").insert({
        application_id: interview.application_id,
        candidate_id: interview.candidate_id,
        violation_type: type,
        details: detail,
      } as any);
    } catch {}
  };

  const handleLeave = async () => {
    // Do NOT set ended_at here. A candidate/HR dropping off (network glitch,
    // refresh, quick step-out) must be able to rejoin. Only HR's explicit
    // "Close Interview" action in HRInterviewsView marks the interview as over.
    navigate(-1);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!meetingId || !token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-center px-6">
        <p className="text-sm text-muted-foreground max-w-sm">
          The meeting room could not be opened. Ask your recruiter to retry, then join again from your dashboard.
        </p>
        <button onClick={() => navigate(-1)} className="text-sm text-primary hover:underline">Go back</button>
      </div>
    );
  }

  return (
    <VideoMeetingRoom
      meetingId={meetingId}
      token={token}
      userName={userName}
      forceScreenShare={interview?.round_type === "technical"}
      onLeave={handleLeave}
      onViolation={logViolation}
    />
  );
}
