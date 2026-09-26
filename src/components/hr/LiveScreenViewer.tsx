import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { liveChannelName } from "@/lib/liveScreen";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MonitorOff, Radio } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  applicationId: string;
  stage: string;
  candidateName?: string;
}

/** HR / hiring-manager live view of a candidate's shared screen during a proctored round. */
export default function LiveScreenViewer({ open, onOpenChange, applicationId, stage, candidateName }: Props) {
  const [frame, setFrame] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [lastAt, setLastAt] = useState<number | null>(null);
  const staleRef = useRef<number>();

  useEffect(() => {
    if (!open) {
      setFrame(null);
      setLive(false);
      setLastAt(null);
      return;
    }
    const channel = supabase.channel(liveChannelName(applicationId, stage), {
      config: { broadcast: { self: false } },
    });
    channel
      .on("broadcast", { event: "frame" }, ({ payload }: any) => {
        setLastAt(Date.now());
        setLive(!!payload?.live);
        if (payload?.image) setFrame(payload.image);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.send({ type: "broadcast", event: "request-frame", payload: {} });
        }
      });

    staleRef.current = window.setInterval(() => {
      setLastAt((t) => {
        if (t && Date.now() - t > 8000) setLive(false);
        return t;
      });
    }, 3000);

    return () => {
      if (staleRef.current) window.clearInterval(staleRef.current);
      supabase.removeChannel(channel);
    };
  }, [open, applicationId, stage]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {live ? <Radio className="h-4 w-4 animate-pulse text-destructive" /> : <MonitorOff className="h-4 w-4 text-muted-foreground" />}
            Live screen — {candidateName || "Candidate"}
            <span className="text-xs font-normal text-muted-foreground capitalize">({stage.replace(/_/g, " ")})</span>
          </DialogTitle>
        </DialogHeader>
        <div className="flex min-h-[320px] items-center justify-center rounded-lg bg-black p-2">
          {frame ? (
            <img src={frame} alt="Candidate live screen share" className="max-h-[60vh] w-full object-contain" />
          ) : (
            <p className="text-sm text-muted-foreground">
              Waiting for the candidate's screen… this only works while they are taking the test.
            </p>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {live
            ? "Live — refreshes every 2 seconds."
            : "No live feed right now. The full session recording is available once the round is submitted."}
        </p>
      </DialogContent>
    </Dialog>
  );
}
