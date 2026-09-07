import type { DiagramDocument } from "@mapgrain/document";
import type { FlowNodeDraft } from "../diagram/sceneToFlow.ts";

interface InspectorProps {
  document: DiagramDocument;
  node: FlowNodeDraft | null;
}

export function Inspector({ document, node }: InspectorProps) {
  if (!node) {
    return (
      <aside className="inspector" aria-label="Inspector">
        <div className="pane-label">Inspector</div>
        <dl>
          <dt>Selection</dt>
          <dd>Select a component to see relations.</dd>
        </dl>
      </aside>
    );
  }
  const relations = document.edges.filter(
    (edge) => edge.source.nodeId === node.id || edge.target.nodeId === node.id,
  );
  const source = document.nodes.find((item) => item.id === node.id);
  return (
    <aside className="inspector" aria-label="Inspector">
      <div className="pane-label">Inspector</div>
      <dl>
        <dt>Component</dt>
        <dd>{node.data.label}</dd>
        <dt>Kind</dt>
        <dd>{node.data.kind ?? "group"}</dd>
        {source?.description ? (
          <>
            <dt>Description</dt>
            <dd>{source.description}</dd>
          </>
        ) : null}
        <dt>Relations</dt>
        <dd>
          {relations.length === 0 ? (
            "No relations in the diagram."
          ) : (
            <ul>
              {relations.map((edge) => (
                <li key={edge.id}>
                  {edge.source.nodeId} → {edge.target.nodeId}
                  {edge.label ? ` (${edge.label})` : ""}
                </li>
              ))}
            </ul>
          )}
        </dd>
      </dl>
    </aside>
  );
}
