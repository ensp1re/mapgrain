import { applyOperation, type DiagramDocument, type Operation } from "@mapgrain/document";
import { EXPORT_FORMAT, exportVector } from "@mapgrain/renderer/vector";
import type { EditorSnapshot } from "../types/editor.ts";
import type { PersistStore } from "../types/persist.ts";

export interface OfflineLoopResult {
  snapshot: EditorSnapshot;
  json: Uint8Array;
  svg: Uint8Array;
}

export async function editPersistReloadExport(
  store: PersistStore,
  snapshot: EditorSnapshot,
  operations: Operation[],
): Promise<OfflineLoopResult> {
  let document: DiagramDocument = snapshot.document;
  for (const operation of operations) {
    const result = applyOperation(document, operation);
    if (!result.ok) {
      throw new Error(result.errors[0]?.message ?? "edit rejected");
    }
    document = result.document;
  }
  const next: EditorSnapshot = { document, positions: snapshot.positions };
  await store.save(next);
  const reloaded = await store.load();
  if (!reloaded) throw new Error("reload returned no document");
  const json = exportVector({ document: reloaded.document, format: EXPORT_FORMAT.JSON });
  const svg = exportVector({ document: reloaded.document, format: EXPORT_FORMAT.SVG });
  if (!json.ok || !svg.ok) throw new Error("export failed");
  return { snapshot: reloaded, json: json.bytes, svg: svg.bytes };
}
