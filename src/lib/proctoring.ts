// Proctoring utilities: screen recording, extra violation listeners,
// clean audio constraints, and face/phone detection via MediaPipe.
import { supabase } from "@/integrations/supabase/client";

// ---------- Audio: suppress keyboard/mouse noise ----------
export const cleanAudioConstraints: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  // @ts-ignore - non-standard chromium hints
  googHighpassFilter: true,
  // @ts-ignore
  googTypingNoiseDetection: true,
};

// ---------- Extra violation listeners (blur, fullscreen exit) ----------
export function attachViolationListeners(
  onViolation: (type: string, desc: string) => void
): () => void {
  const onBlur = () => onViolation("window_blur", "Window lost focus");
  const onFsChange = () => {
    if (!document.fullscreenElement) {
      onViolation("fullscreen_exit", "Exited fullscreen mode");
    }
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && document.fullscreenElement) {
      onViolation("fullscreen_exit_attempt", "Pressed Escape to exit fullscreen");
    }
  };
  window.addEventListener("blur", onBlur);
  document.addEventListener("fullscreenchange", onFsChange);
  document.addEventListener("keydown", onKey);
  return () => {
    window.removeEventListener("blur", onBlur);
    document.removeEventListener("fullscreenchange", onFsChange);
    document.removeEventListener("keydown", onKey);
  };
}

// ---------- Screen recording (full session) ----------
export interface ScreenRecorder {
  stop: () => Promise<string | null>;
  stream: MediaStream;
}

export async function startScreenRecording(
  candidateUserId: string,
  applicationId: string
): Promise<ScreenRecorder> {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    // @ts-ignore - non-standard chromium options
    video: { displaySurface: "monitor" },
    audio: true,
  });
  const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
    ? "video/webm;codecs=vp9,opus"
    : "video/webm";
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 800_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.start(5000);

  const stop = async (): Promise<string | null> => {
    return await new Promise<string | null>((resolve) => {
      rec.onstop = async () => {
        try {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(chunks, { type: "video/webm" });
          if (!blob.size) return resolve(null);
          const path = `${candidateUserId}/${applicationId}-${Date.now()}.webm`;
          const { error } = await supabase.storage
            .from("test-recordings")
            .upload(path, blob, { contentType: "video/webm", upsert: false });
          if (error) {
            console.error("screen upload failed", error);
            return resolve(null);
          }
          resolve(path);
        } catch (e) {
          console.error(e);
          resolve(null);
        }
      };
      if (rec.state !== "inactive") rec.stop();
      else resolve(null);
    });
  };

  return { stop, stream };
}

// ---------- MediaPipe face + object detection ----------
let visionCache: any = null;
async function loadVision() {
  if (visionCache) return visionCache;
  const { FilesetResolver, FaceDetector, ObjectDetector } = await import(
    "@mediapipe/tasks-vision"
  );
  const fileset = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
  );
  const faceDetector = await FaceDetector.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
  });
  const objectDetector = await ObjectDetector.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float32/1/efficientdet_lite0.tflite",
      delegate: "GPU",
    },
    scoreThreshold: 0.5,
    runningMode: "VIDEO",
  });
  visionCache = { faceDetector, objectDetector };
  return visionCache;
}

const PHONE_CLASSES = new Set([
  "cell phone",
  "mobile phone",
  "phone",
  "remote",
]);

export async function startFaceGuard(
  video: HTMLVideoElement,
  onViolation: (type: string, desc: string) => void
): Promise<() => void> {
  let stopped = false;
  let last = { noFace: 0, multi: 0, phone: 0 };
  let vision: any = null;
  try {
    vision = await loadVision();
  } catch (e) {
    console.warn("Vision models failed to load; face guard disabled", e);
    return () => {};
  }
  const COOLDOWN = 15_000;

  const loop = () => {
    if (stopped) return;
    if (video.readyState >= 2) {
      const t = performance.now();
      try {
        const faces = vision.faceDetector.detectForVideo(video, t)?.detections || [];
        const objs = vision.objectDetector.detectForVideo(video, t)?.detections || [];
        const now = Date.now();
        if (faces.length === 0 && now - last.noFace > COOLDOWN) {
          last.noFace = now;
          onViolation("no_face_detected", "No face detected in webcam frame");
        } else if (faces.length > 1 && now - last.multi > COOLDOWN) {
          last.multi = now;
          onViolation("multiple_faces", `${faces.length} faces detected in webcam frame`);
        }
        const phone = objs.find((o: any) =>
          o.categories?.some((c: any) => PHONE_CLASSES.has((c.categoryName || "").toLowerCase()))
        );
        if (phone && now - last.phone > COOLDOWN) {
          last.phone = now;
          onViolation("phone_detected", "Mobile phone detected in webcam frame");
        }
      } catch (e) {
        // swallow per-frame errors
      }
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return () => {
    stopped = true;
  };
}
