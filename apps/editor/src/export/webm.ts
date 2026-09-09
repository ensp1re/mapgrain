import { STORY_WEBM } from "../constants/video.ts";

export const STORY_WEBM_CANCELLED = "Story WebM export cancelled.";
export const STORY_WEBM_NO_STORY = "Story WebM export needs a story with steps.";
export const STORY_WEBM_NO_RECORDER = "Story WebM export needs MediaRecorder.";

export interface StoryWebmRecorder {
  record(frames: Uint8Array[], signal?: AbortSignal): Promise<Uint8Array>;
}

export async function encodeStoryWebm(
  frames: Uint8Array[],
  options: { signal?: AbortSignal; recorder?: StoryWebmRecorder } = {},
): Promise<{ ok: true; bytes: Uint8Array } | { ok: false; message: string }> {
  if (frames.length === 0) return { ok: false, message: STORY_WEBM_NO_STORY };
  if (options.signal?.aborted) return { ok: false, message: STORY_WEBM_CANCELLED };
  const recorder = options.recorder ?? canvasRecorder();
  if (!recorder) return { ok: false, message: STORY_WEBM_NO_RECORDER };
  try {
    const bytes = await recorder.record(frames, options.signal);
    if (options.signal?.aborted) return { ok: false, message: STORY_WEBM_CANCELLED };
    return { ok: true, bytes };
  } catch (error) {
    if (options.signal?.aborted) return { ok: false, message: STORY_WEBM_CANCELLED };
    return { ok: false, message: error instanceof Error ? error.message : STORY_WEBM_NO_RECORDER };
  }
}

function canvasRecorder(): StoryWebmRecorder | null {
  if (typeof MediaRecorder === "undefined" || typeof document === "undefined") return null;
  return {
    async record(frames, signal) {
      const canvas = document.createElement("canvas");
      canvas.width = STORY_WEBM.width;
      canvas.height = STORY_WEBM.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error(STORY_WEBM_NO_RECORDER);
      if (typeof canvas.captureStream !== "function") throw new Error(STORY_WEBM_NO_RECORDER);
      const stream = canvas.captureStream(STORY_WEBM.fps);
      const mimeType = MediaRecorder.isTypeSupported(STORY_WEBM.mimeType)
        ? STORY_WEBM.mimeType
        : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      const stopped = new Promise<Uint8Array>((resolve, reject) => {
        recorder.onstop = () => {
          void new Blob(chunks, { type: mimeType }).arrayBuffer().then((buffer) => {
            resolve(new Uint8Array(buffer));
          }, reject);
        };
        recorder.onerror = () => reject(new Error("Story WebM recording failed."));
      });
      recorder.start();
      try {
        for (const frame of frames) {
          if (signal?.aborted) break;
          const image = await blobImage(frame);
          ctx.fillStyle = "#1c1c1f";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          const scale = Math.min(canvas.width / image.width, canvas.height / image.height);
          const width = image.width * scale;
          const height = image.height * scale;
          ctx.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
          await wait(STORY_WEBM.secondsPerStep * 1000, signal);
        }
      } finally {
        if (recorder.state !== "inactive") recorder.stop();
        for (const track of stream.getTracks()) track.stop();
      }
      return stopped;
    },
  };
}

function blobImage(bytes: Uint8Array): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(new Blob([Uint8Array.from(bytes)], { type: "image/png" }));
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Story WebM frame failed."));
    };
    image.src = url;
  });
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}
