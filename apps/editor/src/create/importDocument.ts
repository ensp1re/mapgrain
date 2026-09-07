import { snapshotFromStored } from "../persist/codec.ts";
import type { EditorSnapshot } from "../types/editor.ts";

export function importDocumentText(text: string): { snapshot: EditorSnapshot } | { error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    return { error: "That file is not valid JSON." };
  }
  const snapshot = snapshotFromStored({ document: raw });
  if (!snapshot) return { error: "That file is not a valid Mapgrain document." };
  return { snapshot };
}
