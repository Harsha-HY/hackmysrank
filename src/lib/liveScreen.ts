import { supabase } from "@/integrations/supabase/client";

/**
 * Live screen-share relay.
 *
 * The candidate's browser grabs a JPEG frame from the shared-screen MediaStream
 * every couple of seconds and broadcasts it over a Supabase realtime channel.
 * HR / hiring managers subscribe to the same channel and see the frames live.
 *
 * Frames are never stored — only the recording (already handled in proctoring.ts) is.
 */

export function liveChannelName(applicationId: string, stage: string) {
  return `live-screen:${applicationId}:${stage}`;
}

const FRAME_MS = 2000;
const FRAME_WIDTH = 560;


export function startLiveScreenBroadcast(
  applicationId: string,
  stage: string,
  stream: MediaStream,
  candidateName?: string,
) {
  const channel = supabase.channel(liveChannelName(applicationId, stage), {
    config: { broadcast: { self: false } },
  });

  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  video.play().catch(() => {});

  const canvas = document.createElement("canvas");
  let timer: number | undefined;
  let stopped = false;

  const sendFrame = () => {
    if (stopped) return;
    const track = stream.getVideoTracks()[0];
    const liveTrack = track && track.readyState === "live";
    if (!liveTrack || !video.videoWidth) {
      channel.send({ type: "broadcast", event: "frame", payload: { live: false, ts: Date.now() } });
      return;
    }
    const scale = Math.min(1, FRAME_WIDTH / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    let data = "";
    try {
      data = canvas.toDataURL("image/jpeg", 0.4);
    } catch {
      return;
    }
    // Realtime broadcast payloads are capped (~256KB); skip frames that are too heavy.
    if (data.length > 200_000) {
      try {
        data = canvas.toDataURL("image/jpeg", 0.25);
      } catch { /* noop */ }
      if (data.length > 200_000) return;
    }

    channel.send({
      type: "broadcast",
      event: "frame",
      payload: { live: true, ts: Date.now(), image: data, name: candidateName || null },
    });
  };

  channel
    .on("broadcast", { event: "request-frame" }, () => sendFrame())
    .subscribe((status) => {
      if (status === "SUBSCRIBED" && !timer) {
        sendFrame();
        timer = window.setInterval(sendFrame, FRAME_MS);
      }
    });

  return () => {
    stopped = true;
    if (timer) window.clearInterval(timer);
    try {
      channel.send({ type: "broadcast", event: "frame", payload: { live: false, ended: true, ts: Date.now() } });
    } catch {
      /* noop */
    }
    supabase.removeChannel(channel);
    video.srcObject = null;
  };
}
