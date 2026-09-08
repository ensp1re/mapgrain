import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateDocument, type DiagramDocument } from "@mapgrain/document";
import { EXPORT_FORMAT, exportDiagram } from "@mapgrain/renderer";

export const STORY_VIDEO = {
  width: 1280,
  height: 720,
  secondsPerStep: 2,
  format: "mp4",
} as const;

export function storyFrames(document: DiagramDocument): Array<{ id: string; nodeIds?: string[] }> {
  const story = document.stories?.[0];
  if (!story) return [];
  return story.steps.map((step) => {
    const view = step.viewId ? document.views.find((item) => item.id === step.viewId) : undefined;
    return {
      id: step.id,
      nodeIds: step.nodeId ? [step.nodeId] : view?.nodeIds,
    };
  });
}

export function encodeStoryVideo(
  document: unknown,
  ffmpeg: (args: string[]) => { status: number; stderr: string } = runFfmpeg,
): { ok: true; bytes: Uint8Array } | { ok: false; message: string } {
  const validated = validateDocument(document);
  if (!validated.ok) return { ok: false, message: validated.errors[0]?.message ?? "invalid document" };
  const frames = storyFrames(validated.document);
  if (frames.length === 0) return { ok: false, message: "video export needs a story with steps" };
  const dir = join(tmpdir(), `mapgrain-story-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  const list: string[] = [];
  for (const [index, frame] of frames.entries()) {
    const png = exportDiagram({
      document: validated.document,
      format: EXPORT_FORMAT.PNG,
      nodeIds: frame.nodeIds,
      scale: 1,
    });
    if (!png.ok) return { ok: false, message: png.errors[0]?.message ?? "frame failed" };
    const file = join(dir, `frame-${String(index).padStart(3, "0")}.png`);
    writeFileSync(file, png.bytes);
    list.push(`file '${file}'`);
    list.push(`duration ${STORY_VIDEO.secondsPerStep}`);
  }
  const last = list.at(-2);
  if (last) list.push(last);
  const concat = join(dir, "concat.txt");
  writeFileSync(concat, `${list.join("\n")}\n`);
  const out = join(dir, "story.mp4");
  const result = ffmpeg([
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concat,
    "-pix_fmt",
    "yuv420p",
    "-vf",
    `scale=${STORY_VIDEO.width}:${STORY_VIDEO.height}:force_original_aspect_ratio=decrease,pad=${STORY_VIDEO.width}:${STORY_VIDEO.height}:(ow-iw)/2:(oh-ih)/2`,
    out,
  ]);
  if (result.status !== 0) return { ok: false, message: result.stderr.slice(0, 240) || "ffmpeg failed" };
  return { ok: true, bytes: new Uint8Array(readFileSync(out)) };
}

function runFfmpeg(args: string[]): { status: number; stderr: string } {
  const spawned = spawnSync("ffmpeg", args, { encoding: "utf8" });
  return { status: spawned.status ?? 1, stderr: spawned.stderr ?? "" };
}
