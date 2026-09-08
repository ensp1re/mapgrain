import { applyPortableLayout, portablePositions, validateDocument } from "@mapgrain/document";
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

function placedSnapshot(document: EditorSnapshot["document"], extra?: PositionMap): EditorSnapshot {
  const fromLayout = portablePositions(document);
  const positions =
    extra && Object.keys(extra).length > 0
      ? extra
      : Object.keys(fromLayout).length > 0
        ? fromLayout
        : null;
  if (positions) {
    return { document: applyPortableLayout(document, positions), positions };
  }
  const scene = buildScene(document);
  if (!scene.ok) return { document, positions: {} };
  const placed = positionsFromScene(scene.scene.nodes);
  return { document: applyPortableLayout(document, placed), positions: placed };
}

export function snapshotFromStored(value: unknown): EditorSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const direct = validateDocument(value);
  if (direct.ok) return placedSnapshot(direct.document);
  const record = value as StoredWorkspace;
  const validated = validateDocument(record.document);
  if (!validated.ok) return null;
  return placedSnapshot(validated.document, isPositionMap(record.positions) ? record.positions : undefined);
}

export function storedFromSnapshot(snapshot: EditorSnapshot, openedAt?: string): StoredWorkspace {
  const document = applyPortableLayout(snapshot.document, snapshot.positions);
  const now = new Date().toISOString();
  return {
    document,
    positions: snapshot.positions,
    updatedAt: now,
    lastOpenedAt: openedAt ?? now,
  };
}

export function backupBytes(snapshot: EditorSnapshot): Uint8Array {
  const document = applyPortableLayout(snapshot.document, snapshot.positions);
  return new TextEncoder().encode(`${JSON.stringify(document, null, 2)}\n`);
}
