import { useEffect, useMemo, useRef, useState } from "react";
import {
  MeetingProvider,
  useMeeting,
  useParticipant,
  usePubSub,
} from "@videosdk.live/react-sdk";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, PhoneOff, Users, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "@/components/BrandLoader";

interface Props {
  meetingId: string;
  token: string;
  userName: string;
  forceScreenShare?: boolean;
  onLeave?: () => void;
  onViolation?: (type: string, detail?: string) => void;
}

/* ---------------- Participant tile ---------------- */

function CamTile({ participantId }: { participantId: string }) {
  const { webcamStream, micStream, webcamOn, micOn, isLocal, displayName } = useParticipant(participantId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (webcamOn && webcamStream) {
      const ms = new MediaStream([webcamStream.track]);
      el.srcObject = ms;
      el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
  }, [webcamStream, webcamOn]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || isLocal) return;
    if (micOn && micStream) {
      el.srcObject = new MediaStream([micStream.track]);
      el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
  }, [micStream, micOn, isLocal]);

  return (
    <div className="relative bg-zinc-900 rounded-lg overflow-hidden aspect-video">
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
      {!isLocal && <audio ref={audioRef} autoPlay playsInline />}
      {!webcamOn && (
        <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-sm">
          Camera off
        </div>
      )}
      <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/60 text-white text-xs">
        {displayName || "Guest"} {isLocal && "(You)"}
      </div>
      {!micOn && (
        <div className="absolute top-2 right-2 p-1 rounded-full bg-black/60">
          <MicOff className="h-3 w-3 text-red-400" />
        </div>
      )}
    </div>
  );
}

function ScreenTile({ participantId }: { participantId: string }) {
  const { screenShareStream, screenShareAudioStream, screenShareOn, isLocal, displayName } = useParticipant(participantId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (screenShareOn && screenShareStream) {
      el.srcObject = new MediaStream([screenShareStream.track]);
      el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
  }, [screenShareStream, screenShareOn]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || isLocal) return;
    if (screenShareOn && screenShareAudioStream) {
      el.srcObject = new MediaStream([screenShareAudioStream.track]);
      el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
  }, [screenShareAudioStream, screenShareOn, isLocal]);

  if (!screenShareOn) return null;

  return (
    <div className="relative bg-zinc-900 rounded-lg overflow-hidden aspect-video">
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain bg-black" />
      {!isLocal && <audio ref={audioRef} autoPlay playsInline />}
      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-primary/80 text-white text-[10px] font-medium">SCREEN</div>
      <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/60 text-white text-xs">
        {displayName || "Guest"} · sharing
      </div>
    </div>
  );
}

/* ---------------- Meeting view ---------------- */

function MeetingView({ userName, forceScreenShare, onLeave, onViolation }: Omit<Props, "meetingId" | "token">) {
  const { toast } = useToast();
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const wasSharingRef = useRef(false);

  const {
    join, leave, toggleMic, toggleWebcam, enableScreenShare, disableScreenShare,
    participants, localMicOn, localWebcamOn, localScreenShareOn,
  } = useMeeting({
    onMeetingJoined: () => { setJoined(true); setJoining(false); },
    onMeetingLeft: () => { setJoined(false); onLeave?.(); },
    onError: (err: any) => {
      setJoining(false);
      console.error("VideoSDK error:", err);
      toast({
        title: "Meeting error",
        description: err?.message || err?.name || "The meeting connection failed. Please rejoin.",
        variant: "destructive",
      });
    },
  });

  const { publish, messages } = usePubSub("CHAT");

  const ids = useMemo(() => [...participants.keys()], [participants]);

  // Technical rounds: screen share is mandatory.
  useEffect(() => {
    if (joined && forceScreenShare && !localScreenShareOn && !wasSharingRef.current) {
      const t = setTimeout(() => { try { enableScreenShare(); } catch {} }, 1200);
      return () => clearTimeout(t);
    }
  }, [joined, forceScreenShare, localScreenShareOn]);

  useEffect(() => {
    if (!forceScreenShare) return;
    if (localScreenShareOn) { wasSharingRef.current = true; return; }
    if (wasSharingRef.current) {
      wasSharingRef.current = false;
      onViolation?.("screen_share_stopped", "Candidate stopped screen sharing during technical round");
      toast({ title: "⚠️ Violation logged", description: "Screen share is mandatory for this round.", variant: "destructive" });
    }
  }, [localScreenShareOn, forceScreenShare]);

  const startMeeting = async () => {
    if (joining || joined) return;
    setJoining(true);
    try {
      // Ask for camera/mic inside the click so the browser keeps the user gesture.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch (err: any) {
      const name = err?.name || "";
      const msg =
        name === "NotAllowedError" ? "Camera / microphone permission was denied. Allow access in your browser's site settings and try again." :
        name === "NotFoundError" ? "No camera or microphone was detected on this device." :
        name === "NotReadableError" ? "Your camera or microphone is being used by another app. Close it and try again." :
        err?.message || "Could not access camera / microphone.";
      toast({ title: "Cannot start meeting", description: msg, variant: "destructive" });
      setJoining(false);
      return;
    }
    try {
      join();
    } catch (err: any) {
      setJoining(false);
      toast({ title: "Failed to join", description: err?.message || "Could not connect to the meeting.", variant: "destructive" });
    }
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    publish(chatInput, { persist: true });
    setChatInput("");
  };

  if (!joined) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center space-y-5">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/15 flex items-center justify-center">
            <Video className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Ready to join?</h2>
            <p className="text-sm text-zinc-400 mt-1">
              Joining as <span className="text-white">{userName}</span>. Your browser will ask for camera &amp; microphone permission.
            </p>
          </div>
          {forceScreenShare && (
            <div className="text-xs text-amber-400 bg-amber-500/10 rounded-md px-3 py-2">
              This is a technical round — screen sharing is required.
            </div>
          )}
          <Button className="w-full gap-2" onClick={startMeeting} disabled={joining}>
            {joining ? <><Loader2 className="h-4 w-4 animate-spin" /> Connecting…</> : <><Video className="h-4 w-4" /> Join with camera &amp; mic</>}
          </Button>
          <button onClick={() => onLeave?.()} className="text-xs text-zinc-500 hover:text-zinc-300">Cancel</button>
        </div>
      </div>
    );
  }

  const screenIds = ids.filter((id) => participants.get(id)?.screenShareOn);
  const tileCount = ids.length + screenIds.length;
  const cols = tileCount <= 1 ? "grid-cols-1" : tileCount <= 4 ? "grid-cols-2" : "grid-cols-3";

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex items-center justify-between p-3 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/20 text-primary border-0"><Users className="h-3 w-3 mr-1" />{ids.length}</Badge>
          {forceScreenShare && <Badge className="bg-amber-500/20 text-amber-400 border-0">Screen share required</Badge>}
        </div>
        <p className="text-sm text-zinc-400">HireZap Meeting</p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className={`flex-1 grid ${cols} gap-2 p-2 overflow-auto`}>
          {ids.map((id) => <CamTile key={`cam-${id}`} participantId={id} />)}
          {screenIds.map((id) => <ScreenTile key={`scr-${id}`} participantId={id} />)}
          {tileCount === 0 && <div className="col-span-full flex items-center justify-center text-zinc-500">Connecting…</div>}
        </div>

        {showChat && (
          <div className="w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col">
            <div className="p-3 border-b border-zinc-800 text-sm text-zinc-300 font-medium">Chat</div>
            <div className="flex-1 overflow-auto p-3 space-y-2">
              {(messages || []).map((m: any, i: number) => (
                <div key={i} className="text-xs">
                  <span className="text-primary font-medium">{m.senderName}: </span>
                  <span className="text-zinc-300">{m.message}</span>
                </div>
              ))}
            </div>
            <div className="p-2 flex gap-1 border-t border-zinc-800">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                className="flex-1 bg-zinc-800 text-white text-xs px-2 py-1 rounded outline-none"
                placeholder="Type..."
              />
              <Button size="sm" onClick={sendChat}>Send</Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 p-3 bg-zinc-900 border-t border-zinc-800">
        <Button size="icon" variant={localMicOn ? "secondary" : "destructive"} onClick={() => toggleMic()}>
          {localMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </Button>
        <Button size="icon" variant={localWebcamOn ? "secondary" : "destructive"} onClick={() => toggleWebcam()}>
          {localWebcamOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
        </Button>
        <Button
          size="icon"
          variant={localScreenShareOn ? "default" : "secondary"}
          onClick={() => (localScreenShareOn ? disableScreenShare() : enableScreenShare())}
        >
          {localScreenShareOn ? <MonitorOff className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
        </Button>
        <Button size="icon" variant="secondary" onClick={() => setShowChat((s) => !s)}>
          <MessageSquare className="h-4 w-4" />
        </Button>
        <Button variant="destructive" onClick={() => { leave(); onLeave?.(); }} className="gap-2">
          <PhoneOff className="h-4 w-4" /> Leave
        </Button>
      </div>
    </div>
  );
}

/* ---------------- Provider wrapper ---------------- */

export default function VideoMeetingRoom({ meetingId, token, userName, forceScreenShare, onLeave, onViolation }: Props) {
  return (
    <MeetingProvider
      token={token}
      joinWithoutUserInteraction={false}
      config={{
        meetingId,
        name: userName || "Guest",
        micEnabled: true,
        webcamEnabled: true,
        debugMode: false,
      }}
    >
      <MeetingView
        userName={userName}
        forceScreenShare={forceScreenShare}
        onLeave={onLeave}
        onViolation={onViolation}
      />
    </MeetingProvider>
  );
}
