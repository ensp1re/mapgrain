import { DEFAULT_SCALE, MAX_PIXELS, rasterLimits } from "@mapgrain/renderer/vector";

export async function rasterSvgToPng(
  svg: string,
  width: number,
  height: number,
  scale = DEFAULT_SCALE,
): Promise<
  { ok: true; bytes: Uint8Array; width: number; height: number } | { ok: false; message: string }
> {
  const limit = rasterLimits(width, height, scale, MAX_PIXELS);
  if (limit) return { ok: false, message: limit.message };
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return { ok: false, message: "Canvas is not available." };
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const bytes = await canvasToPng(canvas);
    return { ok: true, bytes, width: canvas.width, height: canvas.height };
  } catch {
    return { ok: false, message: "PNG export failed." };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("svg"));
    image.src = url;
  });
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("blob"));
        return;
      }
      void blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer)), reject);
    }, "image/png");
  });
}
