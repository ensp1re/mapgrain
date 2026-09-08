import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function requireEditorAssets(editorDist: string): Promise<string> {
  const index = join(editorDist, "index.html");
  let html: string;
  try {
    html = await readFile(index, "utf8");
  } catch {
    throw new Error(`editor assets missing: ${index}. Build @mapgrain/editor first.`);
  }
  if (!html.includes("<script") || html.includes("Mapgrain studio</p>")) {
    throw new Error("editor assets look like a placeholder; build the real editor dist");
  }
  return html;
}
