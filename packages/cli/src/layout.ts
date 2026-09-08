import { createRequire } from "node:module";
import { applyPortableLayout, validateDocument, type DiagramDocument } from "@mapgrain/document";
import { LAYOUT_STATUS, runLayout, type ElkEngine } from "@mapgrain/layout/run";
import type { Point } from "@mapgrain/scene";
import type { DiagnosticIssue } from "./types/cli.ts";

function pinsFromDocument(document: DiagramDocument): Record<string, Point> {
  const stored = document.layout?.positions ?? {};
  const pins: Record<string, Point> = {};
  for (const id of document.layoutHints.pinnedNodeIds) {
    const point = stored[id];
    if (point) pins[id] = point;
  }
  return pins;
}

function completePositions(document: DiagramDocument): boolean {
  const stored = document.layout?.positions ?? {};
  return document.nodes.every((node) => stored[node.id]);
}

function elkEngine(): ElkEngine {
  const require = createRequire(import.meta.url);
  const ELK = require("elkjs/lib/elk.bundled.js") as new () => ElkEngine;
  return new ELK();
}

export async function ensureLaidOut(
  input: unknown,
  rearrange = false,
): Promise<{ ok: true; document: DiagramDocument } | { ok: false; errors: DiagnosticIssue[] }> {
  const validated = validateDocument(input);
  if (!validated.ok) return { ok: false, errors: validated.errors };
  const document = validated.document;
  if (document.nodes.length === 0) return { ok: true, document };
  if (!rearrange && completePositions(document)) return { ok: true, document };
  const pins = pinsFromDocument(document);
  const result = await runLayout(1, 0, document, pins, elkEngine());
  if (result.status === LAYOUT_STATUS.LAID_OUT) {
    return { ok: true, document: applyPortableLayout(document, result.positions) };
  }
  if (result.status === LAYOUT_STATUS.CONFLICT) {
    return {
      ok: false,
      errors: [
        {
          code: result.conflict.code,
          message: result.conflict.message,
          path: "/layoutHints/pinnedNodeIds",
          elementId: result.conflict.overlappingNodeIds[0] ?? null,
        },
      ],
    };
  }
  return { ok: false, errors: result.errors };
}
