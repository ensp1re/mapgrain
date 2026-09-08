import {
  EDGE_DIRECTION,
  EDGE_TYPE,
  OPERATION_KIND,
  type DiagramDocument,
  type DiagramEdge,
  type Operation,
} from "@mapgrain/document";
import { directionLabel, relationCaption } from "../export/labels.ts";
import type { FlowNodeDraft } from "../types/flow.ts";
import { Pane } from "../ui/Pane.tsx";
import { Select } from "../ui/Select.tsx";

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
      <Pane className="inspector" title="Inspector">
        <dl>
          <dt>Relation</dt>
          <dd>
            {relationCaption(document, edge)}
          </dd>
          <dt>Meaning</dt>
          <dd>
            <Select
              label="Relation type"
              value={edge.type}
              options={Object.values(EDGE_TYPE).map((value) => ({ value, label: value }))}
              onChange={(value) =>
                onOperate({
                  kind: OPERATION_KIND.SET_EDGE_TYPE,
                  edgeId: edge.id,
                  type: value as typeof edge.type,
                })
              }
            />
          </dd>
          <dt>Direction</dt>
          <dd>
            <Select
              label="Relation direction"
              value={edge.direction}
              options={Object.values(EDGE_DIRECTION).map((value) => ({
                value,
                label: directionLabel(value),
              }))}
              onChange={(value) =>
                onOperate({
                  kind: OPERATION_KIND.SET_EDGE_DIRECTION,
                  edgeId: edge.id,
                  direction: value as typeof edge.direction,
                })
              }
            />
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
      </Pane>
    );
  }

  if (!node) return null;
  const source = document.nodes.find((item) => item.id === node.id);
  const relations = document.edges.filter(
    (item) => item.source.nodeId === node.id || item.target.nodeId === node.id,
  );

  return (
    <Pane className="inspector" title="Inspector">
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
            <dt>Keep position</dt>
            <dd>
              <label className="pin-field">
                <input
                  type="checkbox"
                  aria-label="Keep position"
                  checked={document.layoutHints.pinnedNodeIds.includes(source.id)}
                  onChange={(event) =>
                    onOperate({
                      kind: OPERATION_KIND.SET_NODE_PINNED,
                      nodeId: source.id,
                      pinned: event.target.checked,
                    })
                  }
                />
                Pin this node during arrange
              </label>
            </dd>
            <dt>Group</dt>
            <dd>
              <Select
                label="Node group"
                value={source.groupId ?? ""}
                options={[
                  { value: "", label: "No group" },
                  ...document.groups.map((group) => ({ value: group.id, label: group.label })),
                ]}
                onChange={(value) =>
                  onOperate({
                    kind: OPERATION_KIND.SET_NODE_GROUP,
                    nodeId: source.id,
                    groupId: value || null,
                  })
                }
              />
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
                  {relationCaption(document, item)}
                  {item.label ? ` (${item.label})` : ""} · {item.type}
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
    </Pane>
  );
}
