import { DEFAULT_SCALE, MAX_PIXELS, rasterLimits } from "@mapgrain/renderer/vector";

export const RASTER_TYPE = {
  PNG: "image/png",
  JPEG: "image/jpeg",
  WEBP: "image/webp",
} as const;

export type RasterType = (typeof RASTER_TYPE)[keyof typeof RASTER_TYPE];

export async function rasterSvgToPng(
  svg: string,
  width: number,
  height: number,
  scale = DEFAULT_SCALE,
  type: RasterType = RASTER_TYPE.PNG,
): Promise<
  { ok: true; bytes: Uint8Array; width: number; height: number; type: RasterType } | { ok: false; message: string }
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
    if (type !== RASTER_TYPE.PNG) {
      ctx.fillStyle = "#1c1c1f";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const bytes = await canvasToImage(canvas, type);
    return { ok: true, bytes, width: canvas.width, height: canvas.height, type };
  } catch {
    return { ok: false, message: "Raster export failed." };
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

function canvasToImage(canvas: HTMLCanvasElement, type: RasterType): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("blob"));
          return;
        }
        void blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer)), reject);
      },
      type,
      type === RASTER_TYPE.PNG ? undefined : 0.92,
    );
  });
}

export async function copyPngToClipboard(bytes: Uint8Array): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!navigator.clipboard || !("write" in navigator.clipboard) || typeof ClipboardItem === "undefined") {
    return { ok: false, message: "Clipboard image copy is not available." };
  }
  try {
    const blob = new Blob([Uint8Array.from(bytes)], { type: RASTER_TYPE.PNG });
    await navigator.clipboard.write([new ClipboardItem({ [RASTER_TYPE.PNG]: blob })]);
    return { ok: true };
  } catch {
    return { ok: false, message: "Clipboard image copy failed." };
  }
}
