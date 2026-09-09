import type { DiagramDocument, DocumentDelta } from "@mapgrain/document";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function list(title: string, ids: string[]): string {
  if (ids.length === 0) return `<section><h2>${escapeHtml(title)}</h2><p>None.</p></section>`;
  return `<section><h2>${escapeHtml(title)}</h2><ul>${ids.map((id) => `<li>${escapeHtml(id)}</li>`).join("")}</ul></section>`;
}

export function compareReviewHtml(
  before: DiagramDocument,
  after: DiagramDocument,
  delta: DocumentDelta,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Compare ${escapeHtml(before.id)} → ${escapeHtml(after.id)}</title>
  <style>
    :root { color-scheme: dark; background: #1c1c1f; color: #f4f4f5; font: 14px/1.45 Inter, ui-sans-serif, system-ui, sans-serif; }
    body { margin: 0; padding: 24px; }
    h1 { font-size: 22px; letter-spacing: -0.03em; }
    p, li { color: #a1a1aa; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
    section { border: 1px solid #3f3f46; border-radius: 8px; padding: 16px; background: #222226; }
    h2 { font-size: 14px; margin: 0 0 8px; }
    ul { margin: 0; padding-left: 18px; }
    .note { color: #a1a1aa; font-size: 12px; }
    @media (max-width: 800px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <h1>Snapshot review</h1>
  <p class="note">Semantic fields and geometry are listed separately. This review does not invent impact ratings.</p>
  <div class="grid">
    <section>
      <h2>Before</h2>
      <p>${escapeHtml(before.title)} · ${escapeHtml(before.id)} · revision ${before.revision}</p>
      <p>${before.nodes.length} nodes, ${before.edges.length} edges</p>
    </section>
    <section>
      <h2>Delta</h2>
      ${list("Added nodes", delta.addedNodeIds)}
      ${list("Removed nodes", delta.removedNodeIds)}
      ${list("Changed nodes", delta.changedNodeIds)}
      ${list("Moved nodes", delta.movedNodeIds)}
      ${list("Added edges", delta.addedEdgeIds)}
      ${list("Removed edges", delta.removedEdgeIds)}
      ${list("Changed edges", delta.changedEdgeIds)}
      ${list("Rerouted edges", delta.reroutedEdgeIds)}
    </section>
    <section>
      <h2>After</h2>
      <p>${escapeHtml(after.title)} · ${escapeHtml(after.id)} · revision ${after.revision}</p>
      <p>${after.nodes.length} nodes, ${after.edges.length} edges</p>
    </section>
  </div>
</body>
</html>
`;
}
