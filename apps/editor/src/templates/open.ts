import { portablePositions, validateDocument, type DiagramDocument } from "@mapgrain/document";
import type { EditorSnapshot } from "../types/editor.ts";
import type { TemplateSpec } from "../types/templates.ts";

/**
 * A template keeps its own document id, so opening two in a row used to overwrite one
 * stored document with the other. Every copy gets a fresh id, and an invalid template is
 * reported rather than silently dropped.
 */
export function snapshotFromTemplate(
  spec: TemplateSpec,
  now: number = Date.now(),
): { snapshot: EditorSnapshot } | { error: string } {
  const copy: DiagramDocument = {
    ...structuredClone(spec.document),
    id: `doc${now}`,
    revision: 1,
    title: spec.title,
  };
  delete copy.evidence;
  const result = validateDocument(copy);
  if (!result.ok) {
    return { error: `The ${spec.title} template is not valid: ${result.errors[0]?.message ?? "unknown"}` };
  }
  return { snapshot: { document: result.document, positions: portablePositions(result.document) } };
}
