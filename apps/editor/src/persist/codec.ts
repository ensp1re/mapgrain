import { validateDocument } from "@mapgrain/document";
import { buildScene } from "@mapgrain/scene";
import { positionsFromScene } from "../geometry/positions.ts";
import type { EditorSnapshot, PositionMap } from "../types/editor.ts";
import type { StoredWorkspace } from "../types/persist.ts";

function isPositionMap(value: unknown): value is PositionMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value).every(
    (point) =>
      Boolean(point) &&
      typeof point === "object" &&
      Number.isFinite((point as { x?: unknown }).x) &&
      Number.isFinite((point as { y?: unknown }).y),
  );
}

export function snapshotFromStored(value: unknown): EditorSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const record = value as StoredWorkspace;
  const validated = validateDocument(record.document);
  if (!validated.ok) return null;
  if (isPositionMap(record.positions)) {
    return { document: validated.document, positions: record.positions };
  }
  const scene = buildScene(validated.document);
  if (!scene.ok) return { document: validated.document, positions: {} };
  return { document: validated.document, positions: positionsFromScene(scene.scene.nodes) };
}

export function storedFromSnapshot(snapshot: EditorSnapshot): StoredWorkspace {
  return { document: snapshot.document, positions: snapshot.positions };
}

export function backupBytes(snapshot: EditorSnapshot): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(snapshot.document, null, 2)}\n`);
}
