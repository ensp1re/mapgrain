import {
  DOCUMENT_KIND,
  EDGES_FOR_KIND,
  EDGE_DIRECTION,
  EDGE_SHAPE,
  NODE_MARKER,
  NODES_FOR_KIND,
  OPERATION_KIND,
  type DiagramDocument,
  type DiagramEdge,
  type NodeKind,
  type NodeMarker,
  type Operation,
} from "@mapgrain/document";
import { kindTitle } from "../constants/kind.ts";
import { KindIcon } from "../diagram/KindIcon.tsx";
import { directionLabel, nodeLabel, relationSummary } from "../export/labels.ts";
import type { FlowNodeDraft } from "../types/flow.ts";
import { Pane } from "../ui/Pane.tsx";
import { PaneResizer } from "../ui/PaneResizer.tsx";
import { PANE_WIDTH } from "../constants/layout.ts";
import { Select } from "../ui/Select.tsx";

interface InspectorProps {
  document: DiagramDocument;
  node: FlowNodeDraft | null;
  edge: DiagramEdge | null;
  error: string | null;
  collision?: { neighborIds: string[] } | null;
  onOperate: (operation: Operation) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onFocusNode?: (id: string) => void;
  onClose?: () => void;
  onApplyCollision?: () => void;
  onCancelCollision?: () => void;
}

export function Inspector({
  document,
  node,
  edge,
  error,
  collision,
  onOperate,
  onDelete,
  onDuplicate,
  onFocusNode,
  onClose,
  onApplyCollision,
  onCancelCollision,
}: InspectorProps) {
  if (!node && !edge) return null;
  const kinds = NODES_FOR_KIND[document.kind];
  const edgeTypes = EDGES_FOR_KIND[document.kind];

  if (edge) {
    return (
      <Pane
      className="inspector"
      title="Connection"
      onClose={onClose}
      edge={
        <PaneResizer
          property="--inspector-w"
          edge="left"
          label="Resize details"
          defaultWidth={PANE_WIDTH.INSPECTOR}
        />
      }
    >
        <dl>
          <dt>From</dt>
          <dd>
            <button
              type="button"
              className="text-btn ghost relation-end"
              title="Select the component this starts from"
              onClick={() => onFocusNode?.(edge.source.nodeId)}
            >
              {nodeLabel(document, edge.source.nodeId)}
            </button>
          </dd>
          <dt>To</dt>
          <dd>
            <button
              type="button"
              className="text-btn ghost relation-end"
              title="Select the component this leads to"
              onClick={() => onFocusNode?.(edge.target.nodeId)}
            >
              {nodeLabel(document, edge.target.nodeId)}
            </button>
          </dd>
          <dt>Meaning</dt>
          <dd>
            <Select
              label="Relation type"
              value={edge.type}
              options={edgeTypes.map((value) => ({ value, label: kindTitle(value) }))}
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
          {document.kind === DOCUMENT_KIND.SEQUENCE ? null : (
          <>
          <dt>Line</dt>
          <dd>
            <Select
              label="Line shape"
              value={edge.shape ?? EDGE_SHAPE.ELBOW}
              options={Object.values(EDGE_SHAPE).map((value) => ({
                value,
                label: kindTitle(value),
              }))}
              onChange={(value) =>
                onOperate({
                  kind: OPERATION_KIND.SET_EDGE_SHAPE,
                  edgeId: edge.id,
                  shape: value as typeof EDGE_SHAPE[keyof typeof EDGE_SHAPE],
                })
              }
            />
          </dd>
          </>
          )}
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
          {document.kind === DOCUMENT_KIND.SEQUENCE ? (
            <>
              <dt>Order</dt>
              <dd>
                <input
                  aria-label="Message order"
                  type="number"
                  min={1}
                  defaultValue={edge.order ?? 1}
                  key={`${edge.id}:order:${edge.order ?? ""}`}
                  onBlur={(event) => {
                    const order = Number(event.target.value);
                    if (!Number.isInteger(order) || order < 1) return;
                    onOperate({ kind: OPERATION_KIND.SET_EDGE_ORDER, edgeId: edge.id, order });
                  }}
                />
              </dd>
            </>
          ) : null}
          {document.kind === DOCUMENT_KIND.WORKFLOW ? (
            <>
              <dt>Outcome</dt>
              <dd>
                <input
                  aria-label="Outcome"
                  defaultValue={edge.outcome ?? ""}
                  key={`${edge.id}:outcome:${edge.outcome ?? ""}`}
                  onBlur={(event) =>
                    onOperate({
                      kind: OPERATION_KIND.SET_EDGE_OUTCOME,
                      edgeId: edge.id,
                      outcome: event.target.value.trim(),
                    })
                  }
                />
              </dd>
            </>
          ) : null}
          {document.kind === DOCUMENT_KIND.LIFECYCLE ? (
            <>
              <dt>Guard</dt>
              <dd>
                <input
                  aria-label="Transition guard"
                  defaultValue={edge.guard ?? ""}
                  key={`${edge.id}:guard:${edge.guard ?? ""}`}
                  onBlur={(event) =>
                    onOperate({
                      kind: OPERATION_KIND.SET_EDGE_GUARD,
                      edgeId: edge.id,
                      guard: event.target.value.trim(),
                    })
                  }
                />
              </dd>
            </>
          ) : null}
        </dl>
        <div className="inspector-actions">
          <button type="button" className="text-btn is-danger" onClick={onDelete}>
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
    <Pane
      className="inspector"
      title="Component"
      onClose={onClose}
      edge={
        <PaneResizer
          property="--inspector-w"
          edge="left"
          label="Resize details"
          defaultWidth={PANE_WIDTH.INSPECTOR}
        />
      }
    >
      <dl>
        <dt>Name</dt>
        <dd>
          <input
            aria-label={node.type === "group" ? "Group name" : "Name"}
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
        <dt>Type</dt>
        <dd>
          {source ? (
            <Select
              label="Component type"
              value={source.kind}
              options={kinds.map((value) => ({
                value,
                label: kindTitle(value),
                icon: <KindIcon kind={value} />,
              }))}
              onChange={(value) =>
                onOperate({
                  kind: OPERATION_KIND.SET_NODE_KIND,
                  nodeId: source.id,
                  nodeKind: value as NodeKind,
                })
              }
            />
          ) : (
            (node.data.kind ?? "group")
          )}
        </dd>
        {source ? (
          <>
            <dt className="visually-hidden">Keep position</dt>
            <dd>
              <label className="check-row">
                <input
                  type="checkbox"
                  aria-label="Keep position when arranging"
                  checked={document.layoutHints.pinnedNodeIds.includes(source.id)}
                  onChange={(event) =>
                    onOperate({
                      kind: OPERATION_KIND.SET_NODE_PINNED,
                      nodeId: source.id,
                      pinned: event.target.checked,
                    })
                  }
                />
                Keep position when arranging
              </label>
            </dd>
            {document.kind !== DOCUMENT_KIND.SEQUENCE ? (
              <>
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
            {document.kind === DOCUMENT_KIND.LIFECYCLE ? (
              <>
                <dt>Marker</dt>
                <dd>
                  <Select
                    label="State marker"
                    value={source.marker ?? ""}
                    options={[
                      { value: "", label: "None" },
                      { value: NODE_MARKER.INITIAL, label: "Initial" },
                      { value: NODE_MARKER.FINAL, label: "Final" },
                    ]}
                    onChange={(value) =>
                      onOperate({
                        kind: OPERATION_KIND.SET_NODE_MARKER,
                        nodeId: source.id,
                        marker: (value || null) as NodeMarker | null,
                      })
                    }
                  />
                </dd>
              </>
            ) : null}
          </>
        ) : null}
        {source?.description ? (
          <>
            <dt>Description</dt>
            <dd>{source.description}</dd>
          </>
        ) : null}
        <dt>Connections</dt>
        <dd>
          {relations.length === 0 ? (
            <p className="relation-empty">
              No connections yet. Drag from a dot on this card to another, or shift-click a second
              component and use Connect.
            </p>
          ) : (
            <ul className="relation-list">
              {relations.map((item) => {
                const incoming = item.target.nodeId === node.id;
                const otherId = incoming ? item.source.nodeId : item.target.nodeId;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="relation-row"
                      onClick={() => onFocusNode?.(otherId)}
                    >
                      {relationSummary(document, item, node.id)}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </dd>
      </dl>
      {collision ? (
        <div className="collision-banner" role="status">
          <p>
            This name overlaps {collision.neighborIds.join(", ")}. Apply a local shift, or cancel to
            keep the new name where it is.
          </p>
          <div className="inspector-actions">
            <button type="button" className="text-btn" onClick={onCancelCollision}>
              Cancel
            </button>
            <button type="button" className="text-btn primary" onClick={onApplyCollision}>
              Apply
            </button>
          </div>
        </div>
      ) : null}
      <div className="inspector-actions">
        {source ? (
          <button type="button" className="text-btn" onClick={onDuplicate}>
            Duplicate
          </button>
        ) : null}
        {node.type === "component" ? (
          <button type="button" className="text-btn is-danger" onClick={onDelete}>
            Delete
          </button>
        ) : null}
      </div>
    </Pane>
  );
}
