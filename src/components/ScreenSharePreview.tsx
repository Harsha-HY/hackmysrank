import { useEffect, useRef, useState } from "react";
import { Monitor, MonitorOff } from "lucide-react";
import { startLiveScreenBroadcast } from "@/lib/liveScreen";

/**
 * Floating preview of the screen the candidate is currently sharing.
 * Lets the candidate confirm their screen share is live (and what is captured),
 * and streams live frames to HR / hiring managers while the round is in progress.
 */
export default function ScreenSharePreview({
  stream,
  applicationId,
  stage,
  candidateName,
}: {
  stream: MediaStream | null;
  applicationId?: string;
  stage?: string;
  candidateName?: string;
}) {
  const [open, setOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const live = !!stream && stream.getVideoTracks().some((t) => t.readyState === "live");

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (open && stream) {
      el.srcObject = stream;
      el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
  }, [open, stream]);

  useEffect(() => {
    if (!stream || !applicationId || !stage) return;
    const stop = startLiveScreenBroadcast(applicationId, stage, stream, candidateName);
    return stop;
  }, [stream, applicationId, stage, candidateName]);

  if (!stream) return null;


  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col items-start gap-2">
      {open && (
        <div className="rounded-xl border border-border bg-card p-1.5 shadow-2xl">
          <video ref={videoRef} muted playsInline className="h-40 w-64 rounded-lg bg-black object-contain" />
          <p className="px-1 pt-1 text-[10px] text-muted-foreground">
            This is exactly what is being recorded for your interviewer.
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-lg transition-colors ${
          live
            ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
            : "border-destructive/40 bg-destructive/10 text-destructive"
        }`}
      >
        {live ? <Monitor className="h-3.5 w-3.5" /> : <MonitorOff className="h-3.5 w-3.5" />}
        {live ? (open ? "Hide my shared screen" : "View my shared screen") : "Screen share stopped"}
      </button>
    </div>
  );
}
