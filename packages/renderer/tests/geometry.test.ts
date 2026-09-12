import assert from "node:assert/strict";
import test from "node:test";
import { EDGE_DIRECTION, EDGE_TYPE, NODE_KIND, validateDocument } from "@mapgrain/document";
import { EXPORT_FORMAT, exportDiagram } from "../src/index.ts";

function text(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

test("direction none draws no arrow; forward and both do", () => {
  const base = {
    schemaVersion: 1,
    id: "doc-arrows",
    revision: 1,
    kind: "architecture",
    title: "Arrows",
    theme: "dark",
    layoutHints: { direction: "right", pinnedNodeIds: [] },
    groups: [],
    views: [{ id: "overview", kind: "overview", name: "All" }],
    nodes: [
      {
        id: "a",
        kind: NODE_KIND.SERVICE,
        label: "Alpha",
        groupId: null,
        ports: [{ id: "out", side: "east" }],
      },
      {
        id: "b",
        kind: NODE_KIND.SERVICE,
        label: "Beta",
        groupId: null,
        ports: [{ id: "in", side: "west" }],
      },
    ],
  };
  function svgFor(direction: string) {
    const raw = {
      ...base,
      edges: [
        {
          id: "e1",
          source: { nodeId: "a", portId: "out" },
          target: { nodeId: "b", portId: "in" },
          type: EDGE_TYPE.CALLS,
          direction,
        },
      ],
    };
    const validated = validateDocument(raw);
    assert.equal(validated.ok, true);
    const result = exportDiagram({ document: raw, format: EXPORT_FORMAT.SVG });
    assert.equal(result.ok, true);
    if (!result.ok) return "";
    return text(result.bytes);
  }
  const none = svgFor(EDGE_DIRECTION.NONE);
  const forward = svgFor(EDGE_DIRECTION.FORWARD);
  const both = svgFor(EDGE_DIRECTION.BOTH);
  assert.match(none, /data-direction="none"/);
  assert.doesNotMatch(none, /<polygon /);
  assert.match(forward, /<polygon /);
  assert.equal((both.match(/<polygon /g) ?? []).length, 2);
  assert.match(forward, /data-node-kind="service"/);
  assert.match(forward, /data-icon="service"/);
  // The kind is carried by the icon now, not by a row of tracked capitals.
  assert.doesNotMatch(forward, /letter-spacing=/);
});
