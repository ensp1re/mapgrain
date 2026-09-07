import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import {
  EDGE_DIRECTION,
  EDGE_TYPE,
  OPERATION_KIND,
  THEME,
  applyOperation,
  nextPrefixedId,
  validateDocument,
  type DiagramDocument,
  type Operation,
  type Theme,
} from "@mapgrain/document";
import { EXPORT_FORMAT, exportVector } from "@mapgrain/renderer/vector";
import { buildScene } from "@mapgrain/scene";
import nestedGroups from "../../../tests/fixtures/documents/nested-groups.json";
import { ChatDrawer } from "./chrome/ChatDrawer.tsx";
import { CommandMenu } from "./chrome/CommandMenu.tsx";
import { ConnectDialog } from "./chrome/ConnectDialog.tsx";
import { Inspector } from "./chrome/Inspector.tsx";
import { Outline } from "./chrome/Outline.tsx";
import { TopBar } from "./chrome/TopBar.tsx";
import { ALIGN_KIND } from "./constants/align.ts";
import { COMMAND_ID, type CommandId } from "./constants/commands.ts";
import { DUPLICATE_OFFSET, NODE_DRAG_THRESHOLD } from "./constants/edit.ts";
import { ComponentNode } from "./diagram/ComponentNode.tsx";
import { GroupNode } from "./diagram/GroupNode.tsx";
import { RelationEdge } from "./diagram/RelationEdge.tsx";
import { sceneToFlow } from "./diagram/sceneToFlow.ts";
import { alignPositions } from "./geometry/align.ts";
import { positionsFromFlow, positionsFromScene, samePositions } from "./geometry/positions.ts";
import { createHistory, pushHistory, redoHistory, undoHistory } from "./history/stack.ts";
import {
  isDeleteEvent,
  isDuplicateEvent,
  isRedoEvent,
  isUndoEvent,
} from "./keyboard/editShortcut.ts";
import { shouldOpenCommandMenu } from "./keyboard/commandShortcut.ts";
import type {
  AlignKind,
  ConnectionDraft,
  EditorSelection,
  EditorSnapshot,
  PendingConnection,
  PositionMap,
} from "./types/editor.ts";
import type { ComponentNodeData, FlowNodeDraft, GroupNodeData } from "./types/flow.ts";

const nodeTypes = { component: ComponentNode, group: GroupNode };
const edgeTypes = { relation: RelationEdge };
const emptySelection: EditorSelection = { nodeIds: [], edgeIds: [] };

function loadSnapshot(): EditorSnapshot | null {
  const result = validateDocument(nestedGroups);
  if (!result.ok) return null;
  const scene = buildScene(result.document);
  if (!scene.ok) return null;
  return {
    document: result.document,
    positions: positionsFromScene(scene.scene.nodes),
  };
}

function download(filename: string, bytes: Uint8Array, type: string) {
  const blob = new Blob([Uint8Array.from(bytes)], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function usedIds(document: DiagramDocument): string[] {
  return [
    ...document.nodes.map((node) => node.id),
    ...document.edges.map((edge) => edge.id),
    ...document.groups.map((group) => group.id),
    ...document.views.map((view) => view.id),
  ];
}

function isNoOp(document: DiagramDocument, operation: Operation): boolean {
  switch (operation.kind) {
    case OPERATION_KIND.SET_TITLE:
      return document.title === operation.title;
    case OPERATION_KIND.SET_NODE_LABEL:
      return document.nodes.find((node) => node.id === operation.nodeId)?.label === operation.label;
    case OPERATION_KIND.SET_GROUP_LABEL:
      return document.groups.find((group) => group.id === operation.groupId)?.label === operation.label;
    case OPERATION_KIND.SET_EDGE_LABEL:
      return (document.edges.find((edge) => edge.id === operation.edgeId)?.label ?? "") === operation.label;
    case OPERATION_KIND.SET_EDGE_TYPE:
      return document.edges.find((edge) => edge.id === operation.edgeId)?.type === operation.type;
    case OPERATION_KIND.SET_EDGE_DIRECTION:
      return document.edges.find((edge) => edge.id === operation.edgeId)?.direction === operation.direction;
    case OPERATION_KIND.SET_NODE_GROUP:
      return document.nodes.find((node) => node.id === operation.nodeId)?.groupId === operation.groupId;
    default:
      return false;
  }
}

function toFlow(
  drafts: FlowNodeDraft[],
  selectedIds: string[],
  editingId: string | null,
  onStartEdit: (id: string) => void,
  onCommitLabel: (id: string, type: FlowNodeDraft["type"], label: string) => void,
  onCancelEdit: () => void,
): Node[] {
  const selected = new Set(selectedIds);
  return drafts.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    parentId: node.parentId,
    extent: node.parentId ? ("parent" as const) : undefined,
    style: { width: node.width, height: node.height },
    selected: selected.has(node.id),
    data:
      node.type === "group"
        ? ({
            label: node.data.label,
            editing: editingId === node.id,
            onStartEdit: () => onStartEdit(node.id),
            onCommitLabel: (label: string) => onCommitLabel(node.id, "group", label),
            onCancelEdit,
          } satisfies GroupNodeData)
        : ({
            kind: node.data.kind ?? "service",
            label: node.data.label,
            lines: node.data.lines,
            ports: node.data.ports,
            editing: editingId === node.id,
            onStartEdit: () => onStartEdit(node.id),
            onCommitLabel: (label: string) => onCommitLabel(node.id, "component", label),
            onCancelEdit,
          } satisfies ComponentNodeData),
  }));
}

function Specimen() {
  const { fitView, getNodes } = useReactFlow();
  const initial = useMemo(() => loadSnapshot(), []);
  const [theme, setTheme] = useState<Theme>(THEME.DARK);
  const [selection, setSelection] = useState<EditorSelection>({ nodeIds: ["gateway"], edgeIds: [] });
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingConnection | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [history, setHistory] = useState(() => createHistory(initial as EditorSnapshot));
  const historyRef = useRef(history);
  historyRef.current = history;

  const snapshot = history.present;
  const documentModel = snapshot?.document ?? null;

  const scene = useMemo(
    () => (documentModel ? buildScene(documentModel, { positions: snapshot.positions }) : null),
    [documentModel, snapshot],
  );
  const flow = useMemo(() => {
    if (!scene?.ok) return { nodes: [] as FlowNodeDraft[], edges: [] };
    return sceneToFlow(scene.scene);
  }, [scene]);

  const cancelEdit = useCallback(() => setEditingId(null), []);
  const [nodes, setNodes] = useState<Node[]>([]);

  const rfEdges = useMemo<Edge[]>(() => {
    if (!documentModel) return [];
    const selected = new Set(selection.edgeIds);
    return flow.edges.map((edge) => {
      const meaning = documentModel.edges.find((item) => item.id === edge.id);
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        type: "relation",
        selected: selected.has(edge.id),
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
        markerStart:
          meaning?.direction === EDGE_DIRECTION.BOTH
            ? { type: MarkerType.ArrowClosed, width: 16, height: 16 }
            : undefined,
        data: {
          label: meaning?.label,
          type: meaning?.type ?? EDGE_TYPE.CALLS,
          direction: meaning?.direction ?? EDGE_DIRECTION.FORWARD,
        },
      };
    });
  }, [documentModel, flow.edges, selection.edgeIds]);

  const selectedNode = flow.nodes.find((node) => node.id === selection.nodeIds[0]) ?? null;
  const selectedEdge =
    documentModel?.edges.find((edge) => edge.id === selection.edgeIds[0]) ?? null;
  const inspectorOpen = Boolean((selectedNode || selectedEdge) && !presenting);

  useEffect(() => {
    globalThis.document.documentElement.dataset.theme = theme;
  }, [theme]);

  const applyOp = useCallback((operation: Operation, nextPositions?: PositionMap) => {
    const current = historyRef.current.present;
    if (isNoOp(current.document, operation)) return true;
    const result = applyOperation(current.document, operation);
    if (!result.ok) {
      setEditError(result.errors[0]?.message ?? "Invalid edit");
      return false;
    }
    setEditError(null);
    const positions = nextPositions ?? current.positions;
    setHistory((stack) => pushHistory(stack, { document: result.document, positions }));
    return true;
  }, []);

  const commitLabel = useCallback(
    (id: string, type: FlowNodeDraft["type"], label: string) => {
      setEditingId(null);
      const operation: Operation =
        type === "group"
          ? { kind: OPERATION_KIND.SET_GROUP_LABEL, groupId: id, label: label.trim() }
          : { kind: OPERATION_KIND.SET_NODE_LABEL, nodeId: id, label: label.trim() };
      applyOp(operation);
    },
    [applyOp],
  );

  const derivedNodes = useMemo(
    () => toFlow(flow.nodes, selection.nodeIds, editingId, setEditingId, commitLabel, cancelEdit),
    [flow.nodes, selection.nodeIds, editingId, commitLabel, cancelEdit],
  );

  useEffect(() => {
    if (!dragging) {
      setNodes(derivedNodes);
      return;
    }
    setNodes((current) =>
      current.map((node) => {
        const derived = derivedNodes.find((item) => item.id === node.id);
        if (!derived) return node;
        return { ...derived, position: node.position, selected: node.selected };
      }),
    );
  }, [derivedNodes, dragging]);

  const pushPositions = useCallback((positions: PositionMap) => {
    const current = historyRef.current.present;
    if (samePositions(current.positions, positions)) return;
    setHistory((stack) => pushHistory(stack, { document: stack.present.document, positions }));
  }, []);

  const deleteSelection = useCallback(() => {
    const current = historyRef.current.present;
    let nextDoc = current.document;
    const positions = { ...current.positions };
    for (const nodeId of selection.nodeIds) {
      if (!nextDoc.nodes.some((node) => node.id === nodeId)) continue;
      const result = applyOperation(nextDoc, { kind: OPERATION_KIND.DELETE_NODE, nodeId });
      if (!result.ok) {
        setEditError(result.errors[0]?.message ?? "Invalid edit");
        return;
      }
      nextDoc = result.document;
      delete positions[nodeId];
    }
    for (const edgeId of selection.edgeIds) {
      if (!nextDoc.edges.some((edge) => edge.id === edgeId)) continue;
      const result = applyOperation(nextDoc, { kind: OPERATION_KIND.DELETE_EDGE, edgeId });
      if (!result.ok) {
        setEditError(result.errors[0]?.message ?? "Invalid edit");
        return;
      }
      nextDoc = result.document;
    }
    if (nextDoc === current.document) return;
    setEditError(null);
    setSelection(emptySelection);
    setHistory((stack) => pushHistory(stack, { document: nextDoc, positions }));
  }, [selection]);

  const duplicateSelection = useCallback(() => {
    const current = historyRef.current.present;
    let nextDoc = current.document;
    const positions = { ...current.positions };
    const created: string[] = [];
    for (const nodeId of selection.nodeIds) {
      const node = nextDoc.nodes.find((item) => item.id === nodeId);
      if (!node) continue;
      const newId = nextPrefixedId(node.id, usedIds(nextDoc));
      const result = applyOperation(nextDoc, {
        kind: OPERATION_KIND.DUPLICATE_NODE,
        nodeId,
        newId,
      });
      if (!result.ok) {
        setEditError(result.errors[0]?.message ?? "Invalid edit");
        return;
      }
      nextDoc = result.document;
      const origin = positions[nodeId] ?? { x: 0, y: 0 };
      positions[newId] = { x: origin.x + DUPLICATE_OFFSET, y: origin.y + DUPLICATE_OFFSET };
      created.push(newId);
    }
    if (created.length === 0) return;
    setEditError(null);
    setSelection({ nodeIds: created, edgeIds: [] });
    setHistory((stack) => pushHistory(stack, { document: nextDoc, positions }));
  }, [selection.nodeIds]);

  const alignSelection = useCallback((kind: AlignKind) => {
    const current = historyRef.current.present;
    const ids = selection.nodeIds.filter((id) => current.document.nodes.some((node) => node.id === id));
    if (!scene?.ok) return;
    const sizes = Object.fromEntries(
      scene.scene.nodes.map((node) => [node.id, { width: node.rect.width, height: node.rect.height }]),
    );
    pushPositions(alignPositions(current.positions, ids, sizes, kind));
  }, [pushPositions, scene, selection.nodeIds]);

  const confirmConnection = useCallback((draft: ConnectionDraft) => {
    if (!pending) return;
    const current = historyRef.current.present;
    const id = nextPrefixedId("e", usedIds(current.document));
    const ok = applyOp({
      kind: OPERATION_KIND.ADD_EDGE,
      id,
      source: {
        nodeId: pending.source,
        ...(pending.sourceHandle ? { portId: pending.sourceHandle } : {}),
      },
      target: {
        nodeId: pending.target,
        ...(pending.targetHandle ? { portId: pending.targetHandle } : {}),
      },
      type: draft.type,
      direction: draft.direction,
      ...(draft.label ? { label: draft.label } : {}),
    });
    if (ok) setSelection({ nodeIds: [], edgeIds: [id] });
    setPending(null);
  }, [applyOp, pending]);

  const exportFormat = useCallback(
    (format: typeof EXPORT_FORMAT.SVG | typeof EXPORT_FORMAT.JSON) => {
      if (!documentModel) return;
      const result = exportVector({ document: documentModel, format, theme });
      if (!result.ok) return;
      download(
        format === EXPORT_FORMAT.JSON ? "diagram.json" : "diagram.svg",
        result.bytes,
        result.mediaType,
      );
    },
    [documentModel, theme],
  );

  const runCommand = useCallback(
    (id: CommandId) => {
      if (id === COMMAND_ID.TOGGLE_THEME) {
        setTheme((current) => (current === THEME.DARK ? THEME.LIGHT : THEME.DARK));
      }
      if (id === COMMAND_ID.TOGGLE_OUTLINE) setOutlineOpen((value) => !value);
      if (id === COMMAND_ID.TOGGLE_CHAT) setChatOpen((value) => !value);
      if (id === COMMAND_ID.UNDO) setHistory((stack) => undoHistory(stack));
      if (id === COMMAND_ID.REDO) setHistory((stack) => redoHistory(stack));
      if (id === COMMAND_ID.PRESENT) setPresenting((value) => !value);
      if (id === COMMAND_ID.FIT) void fitView({ padding: 0.2 });
      if (id === COMMAND_ID.EXPORT_SVG) exportFormat(EXPORT_FORMAT.SVG);
      if (id === COMMAND_ID.EXPORT_JSON) exportFormat(EXPORT_FORMAT.JSON);
      if (id === COMMAND_ID.DELETE) deleteSelection();
      if (id === COMMAND_ID.DUPLICATE) duplicateSelection();
      if (id === COMMAND_ID.ALIGN_LEFT) alignSelection(ALIGN_KIND.LEFT);
      if (id === COMMAND_ID.ALIGN_RIGHT) alignSelection(ALIGN_KIND.RIGHT);
      if (id === COMMAND_ID.ALIGN_TOP) alignSelection(ALIGN_KIND.TOP);
      if (id === COMMAND_ID.ALIGN_BOTTOM) alignSelection(ALIGN_KIND.BOTTOM);
    },
    [alignSelection, deleteSelection, duplicateSelection, exportFormat, fitView],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (shouldOpenCommandMenu(event)) {
        event.preventDefault();
        setCommandsOpen(true);
        return;
      }
      if (isUndoEvent(event)) {
        event.preventDefault();
        runCommand(COMMAND_ID.UNDO);
        return;
      }
      if (isRedoEvent(event)) {
        event.preventDefault();
        runCommand(COMMAND_ID.REDO);
        return;
      }
      if (isDuplicateEvent(event)) {
        event.preventDefault();
        runCommand(COMMAND_ID.DUPLICATE);
        return;
      }
      if (isDeleteEvent(event)) {
        event.preventDefault();
        runCommand(COMMAND_ID.DELETE);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [runCommand]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((current) => applyNodeChanges(changes, current));
  }, []);

  const onNodeDragStart = useCallback(() => setDragging(true), []);

  const onNodeDragStop = useCallback(() => {
    setDragging(false);
    pushPositions(positionsFromFlow(getNodes(), historyRef.current.present.positions));
  }, [getNodes, pushPositions]);

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target || connection.source === connection.target) return;
    setPending({
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle ?? null,
      targetHandle: connection.targetHandle ?? null,
    });
  }, []);

  if (!documentModel || !scene?.ok || !snapshot) {
    return <p>Could not build the specimen diagram.</p>;
  }

  const workspaceClass = [
    "workspace",
    outlineOpen && !presenting ? "" : "is-outline-collapsed",
    inspectorOpen ? "" : "is-inspector-hidden",
    presenting ? "is-presenting" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={presenting ? "app is-presenting" : "app"}>
      <TopBar
        title={documentModel.title}
        saveState={history.past.length === 0 ? "Saved" : "Edited"}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        presenting={presenting}
        chatOpen={chatOpen}
        onTitleCommit={(value) => applyOp({ kind: OPERATION_KIND.SET_TITLE, title: value })}
        onUndo={() => runCommand(COMMAND_ID.UNDO)}
        onRedo={() => runCommand(COMMAND_ID.REDO)}
        onPresent={() => runCommand(COMMAND_ID.PRESENT)}
        onExport={() => runCommand(COMMAND_ID.EXPORT_SVG)}
        onCommand={() => setCommandsOpen(true)}
        onToggleOutline={() => runCommand(COMMAND_ID.TOGGLE_OUTLINE)}
        onToggleChat={() => runCommand(COMMAND_ID.TOGGLE_CHAT)}
      />
      <div className={workspaceClass}>
        {presenting ? null : (
          <Outline
            nodes={flow.nodes}
            selectedId={selection.nodeIds[0] ?? null}
            onSelect={(id) => setSelection({ nodeIds: [id], edgeIds: [] })}
          />
        )}
        <div className="canvas">
          <ReactFlow
            nodes={nodes}
            edges={rfEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onConnect={onConnect}
            onNodeDragStart={onNodeDragStart}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={(_event, node) => setSelection({ nodeIds: [node.id], edgeIds: [] })}
            onEdgeClick={(_event, edge) => setSelection({ nodeIds: [], edgeIds: [edge.id] })}
            onPaneClick={(event) => {
              const target = event.target;
              if (target instanceof Element && target.closest(".node-card, .group-frame, .label-input")) {
                return;
              }
              setSelection(emptySelection);
              setEditingId(null);
            }}
            onNodeDoubleClick={(_event, node) => setEditingId(node.id)}
            onNodeMouseEnter={(event, node) => {
              const box = (event.currentTarget as HTMLElement).closest(".canvas")?.getBoundingClientRect();
              setTooltip({
                x: event.clientX - (box?.left ?? 0) + 12,
                y: event.clientY - (box?.top ?? 0) + 12,
                text: String(node.data.label ?? node.id),
              });
            }}
            onNodeMouseLeave={() => setTooltip(null)}
            onInit={(instance) => void instance.fitView({ padding: 0.2 })}
            deleteKeyCode={null}
            nodeDragThreshold={NODE_DRAG_THRESHOLD}
            minZoom={0.3}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={16} size={1} />
            {presenting ? null : <Controls showInteractive={false} />}
          </ReactFlow>
          {tooltip ? (
            <div className="tooltip" style={{ left: tooltip.x, top: tooltip.y }} role="tooltip">
              {tooltip.text}
            </div>
          ) : null}
          {editError ? (
            <div className="edit-error canvas-error" role="status">
              {editError}
            </div>
          ) : null}
          {pending ? (
            <ConnectDialog
              pending={pending}
              onConfirm={confirmConnection}
              onCancel={() => setPending(null)}
            />
          ) : null}
          {presenting ? null : <ChatDrawer open={chatOpen} />}
        </div>
        {presenting ? null : (
          <Inspector
            document={documentModel}
            node={selectedEdge ? null : selectedNode}
            edge={selectedEdge}
            error={editError}
            onOperate={(operation) => applyOp(operation)}
            onDelete={deleteSelection}
            onDuplicate={duplicateSelection}
          />
        )}
      </div>
      {presenting ? null : (
        <CommandMenu open={commandsOpen} onClose={() => setCommandsOpen(false)} onRun={runCommand} />
      )}
    </div>
  );
}

export function App() {
  return (
    <ReactFlowProvider>
      <Specimen />
    </ReactFlowProvider>
  );
}
