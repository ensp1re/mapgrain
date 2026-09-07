import {
  EDGE_DIRECTION,
  EDGE_TYPE,
  OPERATION_KIND,
  type DiagramDocument,
  type DiagramEdge,
  type Operation,
} from "@mapgrain/document";
import type { FlowNodeDraft } from "../types/flow.ts";

interface InspectorProps {
  document: DiagramDocument;
  node: FlowNodeDraft | null;
  edge: DiagramEdge | null;
  error: string | null;
  onOperate: (operation: Operation) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function Inspector({
  document,
  node,
  edge,
  error,
  onOperate,
  onDelete,
  onDuplicate,
}: InspectorProps) {
  if (!node && !edge) return null;

  if (edge) {
    return (
      <aside className="inspector" aria-label="Inspector">
        <div className="pane-label">Inspector</div>
        <dl>
          <dt>Relation</dt>
          <dd>
            {edge.source.nodeId} → {edge.target.nodeId}
          </dd>
          <dt>Meaning</dt>
          <dd>
            <select
              aria-label="Relation type"
              value={edge.type}
              onChange={(event) =>
                onOperate({
                  kind: OPERATION_KIND.SET_EDGE_TYPE,
                  edgeId: edge.id,
                  type: event.target.value as typeof edge.type,
                })
              }
            >
              {Object.values(EDGE_TYPE).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </dd>
          <dt>Direction</dt>
          <dd>
            <select
              aria-label="Relation direction"
              value={edge.direction}
              onChange={(event) =>
                onOperate({
                  kind: OPERATION_KIND.SET_EDGE_DIRECTION,
                  edgeId: edge.id,
                  direction: event.target.value as typeof edge.direction,
                })
              }
            >
              {Object.values(EDGE_DIRECTION).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </dd>
          <dt>Label</dt>
          <dd>
            <input
              aria-label="Relation label"
              defaultValue={edge.label ?? ""}
              key={`${edge.id}:${edge.label ?? ""}:${error ?? ""}`}
              onBlur={(event) =>
                onOperate({
                  kind: OPERATION_KIND.SET_EDGE_LABEL,
                  edgeId: edge.id,
                  label: event.target.value.trim(),
                })
              }
            />
          </dd>
        </dl>
        {error ? <p className="edit-error">{error}</p> : null}
        <div className="inspector-actions">
          <button type="button" className="text-btn" onClick={onDelete}>
            Delete
          </button>
        </div>
      </aside>
    );
  }

  if (!node) return null;
  const source = document.nodes.find((item) => item.id === node.id);
  const relations = document.edges.filter(
    (item) => item.source.nodeId === node.id || item.target.nodeId === node.id,
  );

  return (
    <aside className="inspector" aria-label="Inspector">
      <div className="pane-label">Inspector</div>
      <dl>
        <dt>Component</dt>
        <dd>
          <input
            aria-label={node.type === "group" ? "Group label" : "Node label"}
            defaultValue={node.data.label}
            key={`${node.id}:${node.data.label}:${error ?? ""}`}
            onBlur={(event) => {
              const label = event.target.value.trim();
              if (node.type === "group") {
                onOperate({ kind: OPERATION_KIND.SET_GROUP_LABEL, groupId: node.id, label });
                return;
              }
              onOperate({ kind: OPERATION_KIND.SET_NODE_LABEL, nodeId: node.id, label });
            }}
          />
        </dd>
        <dt>Kind</dt>
        <dd>{node.data.kind ?? "group"}</dd>
        {source ? (
          <>
            <dt>Group</dt>
            <dd>
              <select
                aria-label="Node group"
                value={source.groupId ?? ""}
                onChange={(event) =>
                  onOperate({
                    kind: OPERATION_KIND.SET_NODE_GROUP,
                    nodeId: source.id,
                    groupId: event.target.value || null,
                  })
                }
              >
                <option value="">No group</option>
                {document.groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.label}
                  </option>
                ))}
              </select>
            </dd>
          </>
        ) : null}
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
              {relations.map((item) => (
                <li key={item.id}>
                  {item.source.nodeId} → {item.target.nodeId}
                  {item.label ? ` (${item.label})` : ""} · {item.type} · {item.direction}
                </li>
              ))}
            </ul>
          )}
        </dd>
      </dl>
      {error ? <p className="edit-error">{error}</p> : null}
      <div className="inspector-actions">
        {source ? (
          <button type="button" className="text-btn" onClick={onDuplicate}>
            Duplicate
          </button>
        ) : null}
        {node.type === "component" ? (
          <button type="button" className="text-btn" onClick={onDelete}>
            Delete
          </button>
        ) : null}
      </div>
    </aside>
  );
}
