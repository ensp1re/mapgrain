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
  type OnSelectionChangeParams,
} from "@xyflow/react";
import {
  EDGE_DIRECTION,
  EDGE_TYPE,
  OPERATION_KIND,
  THEME,
  applyOperation,
  applyPortableLayout,
  nextPrefixedId,
  portablePositions,
  validateDocument,
  type DiagramDocument,
  type NodeKind,
  type Operation,
  type Theme,
} from "@mapgrain/document";
import { LAYOUT_STATUS } from "@mapgrain/layout/run";
import { exportVector } from "@mapgrain/renderer/vector";
import { ExportDialog } from "./chrome/ExportDialog.tsx";
import { EXPORT_CHOICE } from "./constants/export.ts";
import { buildScene } from "@mapgrain/scene";
import nestedGroups from "../../../tests/fixtures/documents/nested-groups.json";
import { ArrangeBar } from "./chrome/ArrangeBar.tsx";
import { ChatDrawer } from "./chrome/ChatDrawer.tsx";
import { StartSurface } from "./chrome/StartSurface.tsx";
import { CommandMenu } from "./chrome/CommandMenu.tsx";
import { ConnectDialog } from "./chrome/ConnectDialog.tsx";
import { Inspector } from "./chrome/Inspector.tsx";
import { Outline } from "./chrome/Outline.tsx";
import { TopBar } from "./chrome/TopBar.tsx";
import { ALIGN_KIND } from "./constants/align.ts";
import { COMMAND_ID, type CommandId } from "./constants/commands.ts";
import { DUPLICATE_OFFSET, NODE_DRAG_THRESHOLD } from "./constants/edit.ts";
import { AddBar } from "./chrome/AddBar.tsx";
import { blankDocument } from "./create/blank.ts";
import { makeNode } from "./create/nodes.ts";
import { AUTOSAVE_MS, SAVE_STATE } from "./constants/persist.ts";
import { ComponentNode } from "./diagram/ComponentNode.tsx";
import { GroupNode } from "./diagram/GroupNode.tsx";
import { RelationEdge } from "./diagram/RelationEdge.tsx";
import { sceneToFlow } from "./diagram/sceneToFlow.ts";
import { alignPositions } from "./geometry/align.ts";
import { positionsFromFlow, positionsFromScene, samePositions } from "./geometry/positions.ts";
import { createHistory, pushHistory, redoHistory, undoHistory } from "./history/stack.ts";
import { reuseUnchangedEdges, reuseUnchangedNodes } from "./edit/flowNodes.ts";
import {
  commandAllowed,
  layoutToken,
  layoutTokenMatches,
  selectionFromFlow,
} from "./edit/safety.ts";
import { retainSelection } from "./edit/selection.ts";
import { EditorErrorBoundary } from "./chrome/ErrorBoundary.tsx";
import {
  isDeleteEvent,
  isDuplicateEvent,
  isRedoEvent,
  isUndoEvent,
} from "./keyboard/editShortcut.ts";
import { shouldOpenCommandMenu } from "./keyboard/commandShortcut.ts";
import { BrowserLayoutEngine } from "./layout/browserEngine.ts";
import { mergePositions, pinsFromDocument } from "./layout/pins.ts";
import { EXAMPLES } from "./create/examples.ts";
import { importDocumentText } from "./create/importDocument.ts";
import { backupBytes, snapshotFromStored } from "./persist/codec.ts";
import { indexedDbStore } from "./persist/indexeddb.ts";
import { memoryStore } from "./persist/memory.ts";
import { readStudioConfig, studioStore } from "./persist/studio.ts";
import type { ArrangeState } from "./types/arrange.ts";
import type { WorkspaceSurface } from "./types/create.ts";
import type {
  AlignKind,
  ConnectionDraft,
  EditorSelection,
  EditorSnapshot,
  PendingConnection,
  PositionMap,
} from "./types/editor.ts";
import type { PersistStore, SaveState } from "./types/persist.ts";
import type { ComponentNodeData, FlowNodeDraft, GroupNodeData } from "./types/flow.ts";

const nodeTypes = { component: ComponentNode, group: GroupNode };
const edgeTypes = { relation: RelationEdge };
const emptySelection: EditorSelection = { nodeIds: [], edgeIds: [] };

function defaultStore(): PersistStore {
  const studio = readStudioConfig();
  if (studio) return studioStore(studio);
  return globalThis.indexedDB ? indexedDbStore() : memoryStore();
}

function loadSnapshot(): EditorSnapshot | null {
  const result = validateDocument(nestedGroups);
  if (!result.ok) return null;
  const scene = buildScene(result.document);
  if (!scene.ok) return null;
  const positions =
    Object.keys(portablePositions(result.document)).length > 0
      ? portablePositions(result.document)
      : positionsFromScene(scene.scene.nodes);
  return {
    document: applyPortableLayout(result.document, positions),
    positions,
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
    case OPERATION_KIND.SET_NODE_PINNED:
      return document.layoutHints.pinnedNodeIds.includes(operation.nodeId) === operation.pinned;
    case OPERATION_KIND.SET_LAYOUT:
      return JSON.stringify(portablePositions(document)) === JSON.stringify(operation.positions);
    case OPERATION_KIND.SET_THEME:
      return document.theme === operation.theme;
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
  const [arrange, setArrange] = useState<ArrangeState>({ status: "idle" });
  const [booted, setBooted] = useState(false);
  const [surface, setSurface] = useState<WorkspaceSurface>("start");
  const [importError, setImportError] = useState<string | null>(null);
  const [recents, setRecents] = useState<Array<{ id: string; title: string }>>([]);
  const [saveState, setSaveState] = useState<SaveState>(SAVE_STATE.SAVED);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [history, setHistory] = useState(() => createHistory(initial as EditorSnapshot));
  const historyRef = useRef(history);
  historyRef.current = history;
  const layoutEngine = useRef<BrowserLayoutEngine | null>(null);
  const persistStore = useRef<PersistStore>(defaultStore());
  const persistGen = useRef(0);
  const skipNextSave = useRef(true);
  const bootRecovery = useRef(false);
  const snapshot = history.present;
  const documentModel = snapshot?.document ?? null;

  useEffect(() => {
    const engine = new BrowserLayoutEngine();
    layoutEngine.current = engine;
    return () => engine.dispose();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void persistStore.current
      .load()
      .then((stored) => {
        if (cancelled) return;
        if (stored) {
          setHistory(createHistory(stored));
          setSurface("editor");
        }
        skipNextSave.current = true;
        setBooted(true);
      })
      .catch(() => {
        if (cancelled) return;
        bootRecovery.current = true;
        skipNextSave.current = true;
        setBooted(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!booted || !snapshot || surface !== "editor") return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      if (!persistStore.current.durable) setSaveState(SAVE_STATE.TEMPORARY);
      else if (readStudioConfig()) setSaveState(SAVE_STATE.FILE_SAVED);
      else setSaveState(bootRecovery.current ? SAVE_STATE.RECOVERY : SAVE_STATE.SAVED);
      return;
    }
    if (!persistStore.current.durable) {
      setSaveState(SAVE_STATE.TEMPORARY);
      return;
    }
    const fileBacked = Boolean(readStudioConfig());
    setSaveState(fileBacked ? SAVE_STATE.FILE_SAVING : SAVE_STATE.SAVING);
    const generation = (persistGen.current += 1);
    const timer = window.setTimeout(() => {
      void persistStore.current
        .save(snapshot)
        .then(() => {
          if (generation === persistGen.current) {
            setSaveState(fileBacked ? SAVE_STATE.FILE_SAVED : SAVE_STATE.SAVED);
          }
        })
        .catch(() => {
          if (generation === persistGen.current) setSaveState(SAVE_STATE.RECOVERY);
        });
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
  }, [booted, snapshot, surface]);

  const openSnapshot = useCallback((next: EditorSnapshot) => {
    skipNextSave.current = false;
    setArrange({ status: "idle" });
    setTheme(next.document.theme);
    setHistory(createHistory(next));
    setSelection({
      nodeIds: next.document.nodes[0] ? [next.document.nodes[0].id] : [],
      edgeIds: [],
    });
    setSurface("editor");
    setImportError(null);
  }, []);

  useEffect(() => {
    void persistStore.current.list().then(setRecents);
  }, [booted, snapshot]);

  const displayPositions =
    arrange.status === "preview" ? arrange.positions : (snapshot?.positions ?? {});

  const scene = useMemo(
    () => (documentModel ? buildScene(documentModel, { positions: displayPositions }) : null),
    [documentModel, displayPositions],
  );
  const flow = useMemo(() => {
    if (!scene?.ok) return { nodes: [] as FlowNodeDraft[], edges: [] };
    return sceneToFlow(scene.scene);
  }, [scene]);

  const cancelEdit = useCallback(() => setEditingId(null), []);
  const [nodes, setNodes] = useState<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);

  const computedEdges = useMemo<Edge[]>(() => {
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
        markerEnd:
          edge.direction === EDGE_DIRECTION.NONE
            ? undefined
            : { type: MarkerType.ArrowClosed, width: 16, height: 16 },
        markerStart:
          edge.direction === EDGE_DIRECTION.BOTH
            ? { type: MarkerType.ArrowClosed, width: 16, height: 16 }
            : undefined,
        data: {
          label: meaning?.label,
          type: meaning?.type ?? EDGE_TYPE.CALLS,
          direction: edge.direction,
          points: edge.points,
        },
      };
    });
  }, [documentModel, flow.edges, selection.edgeIds]);
  const rfEdges = reuseUnchangedEdges(edgesRef.current, computedEdges);
  edgesRef.current = rfEdges;

  const selectedNode = flow.nodes.find((node) => node.id === selection.nodeIds[0]) ?? null;
  const selectedEdge =
    documentModel?.edges.find((edge) => edge.id === selection.edgeIds[0]) ?? null;
  const inspectorOpen = Boolean((selectedNode || selectedEdge) && !presenting);

  useEffect(() => {
    globalThis.document.documentElement.dataset.theme = theme;
  }, [theme]);

  const applyOp = useCallback((operation: Operation, nextPositions?: PositionMap) => {
    if (presenting) return false;
    const current = historyRef.current.present;
    if (isNoOp(current.document, operation)) return true;
    const result = applyOperation(current.document, operation);
    if (!result.ok) {
      setEditError(result.errors[0]?.message ?? "Invalid edit");
      return false;
    }
    setEditError(null);
    const positions = nextPositions ?? current.positions;
    const document =
      operation.kind === OPERATION_KIND.SET_LAYOUT
        ? result.document
        : applyPortableLayout(result.document, positions);
    setArrange({ status: "idle" });
    setHistory((stack) => pushHistory(stack, { document, positions }));
    return true;
  }, [presenting]);

  const addNode = useCallback(
    (kind: NodeKind) => {
      const current = historyRef.current.present;
      const id = nextPrefixedId("n", usedIds(current.document));
      const node = makeNode(id, kind, kind);
      const positions = {
        ...current.positions,
        [id]: { x: 40 + current.document.nodes.length * 24, y: 40 },
      };
      applyOp({ kind: OPERATION_KIND.ADD_NODE, node }, positions);
    },
    [applyOp],
  );

  const addGroup = useCallback(() => {
    const current = historyRef.current.present;
    const id = nextPrefixedId("g", usedIds(current.document));
    applyOp({ kind: OPERATION_KIND.ADD_GROUP, id, label: "Group" });
  }, [applyOp]);

  const connectSelected = useCallback(() => {
    const ids = selection.nodeIds.filter((id) =>
      historyRef.current.present.document.nodes.some((node) => node.id === id),
    );
    if (ids.length < 2 || !ids[0] || !ids[1]) return;
    const current = historyRef.current.present;
    const edgeId = nextPrefixedId("e", usedIds(current.document));
    applyOp({
      kind: OPERATION_KIND.ADD_EDGE,
      id: edgeId,
      source: { nodeId: ids[0], portId: "out" },
      target: { nodeId: ids[1], portId: "in" },
      type: EDGE_TYPE.CALLS,
      direction: EDGE_DIRECTION.FORWARD,
    });
  }, [applyOp, selection.nodeIds]);

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
      setNodes((current) => reuseUnchangedNodes(current, derivedNodes));
      return;
    }
    setNodes((current) =>
      reuseUnchangedNodes(
        current,
        derivedNodes.map((derived) => {
          const live = current.find((item) => item.id === derived.id);
          if (!live) return derived;
          return { ...derived, position: live.position, selected: live.selected };
        }),
      ),
    );
  }, [derivedNodes, dragging]);

  const onSelectionChange = useCallback(({ nodes: selectedNodes, edges: selectedEdges }: OnSelectionChangeParams) => {
    const next = selectionFromFlow(selectedNodes, selectedEdges);
    setSelection((current) => retainSelection(current, next));
  }, []);

  const pushPositions = useCallback((positions: PositionMap) => {
    const current = historyRef.current.present;
    if (samePositions(current.positions, positions)) return;
    applyOp({ kind: OPERATION_KIND.SET_LAYOUT, positions }, positions);
  }, []);

  const startArrange = useCallback(async () => {
    if (presenting) return;
    const current = historyRef.current.present;
    const engine = layoutEngine.current;
    if (!engine) return;
    const token = layoutToken(current.document);
    setArrange({ status: "working" });
    const result = await engine.layout(
      current.document,
      pinsFromDocument(current.document, current.positions),
    );
    const latest = historyRef.current.present.document;
    if (!layoutTokenMatches(latest, token)) {
      setArrange({ status: "idle" });
      return;
    }
    if (result.status === LAYOUT_STATUS.SUPERSEDED) return;
    if (result.status === LAYOUT_STATUS.LAID_OUT) {
      setArrange({ status: "preview", positions: mergePositions(current.positions, result.positions) });
      return;
    }
    if (result.status === LAYOUT_STATUS.CONFLICT) {
      setArrange({
        status: "conflict",
        message: result.conflict.message,
        overlappingNodeIds: result.conflict.overlappingNodeIds,
        pins: result.conflict.pins,
      });
      return;
    }
    setArrange({ status: "idle" });
    setEditError(result.errors[0]?.message ?? "Arrange failed");
  }, [presenting]);

  const applyArrange = useCallback(() => {
    if (arrange.status !== "preview") return;
    pushPositions(arrange.positions);
    setArrange({ status: "idle" });
    void fitView({ padding: 0.2 });
  }, [arrange, fitView, pushPositions]);

  const discardArrange = useCallback(() => setArrange({ status: "idle" }), []);

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
    setHistory((stack) =>
      pushHistory(stack, { document: applyPortableLayout(nextDoc, positions), positions }),
    );
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
    setHistory((stack) =>
      pushHistory(stack, { document: applyPortableLayout(nextDoc, positions), positions }),
    );
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
    (format: (typeof EXPORT_CHOICE)[keyof typeof EXPORT_CHOICE]) => {
      if (!documentModel) return;
      if (format === EXPORT_CHOICE.PNG) {
        setExportError("PNG in the browser needs a canvas raster. Use pnpm mapgrain export --format png.");
        return;
      }
      const result = exportVector({ document: documentModel, format, theme });
      if (!result.ok) {
        setExportError(result.errors[0]?.message ?? "Export failed");
        return;
      }
      setExportError(null);
      const name =
        format === EXPORT_CHOICE.JSON
          ? "diagram.json"
          : format === EXPORT_CHOICE.HTML
            ? "diagram.html"
            : "diagram.svg";
      download(name, result.bytes, result.mediaType);
    },
    [documentModel, theme],
  );

  const runCommand = useCallback(
    (id: CommandId) => {
      if (!commandAllowed(presenting, id)) return;
      if (id === COMMAND_ID.TOGGLE_THEME) {
        const next = theme === THEME.DARK ? THEME.LIGHT : THEME.DARK;
        setTheme(next);
        applyOp({ kind: OPERATION_KIND.SET_THEME, theme: next });
      }
      if (id === COMMAND_ID.TOGGLE_OUTLINE) setOutlineOpen((value) => !value);
      if (id === COMMAND_ID.TOGGLE_CHAT) setChatOpen((value) => !value);
      if (id === COMMAND_ID.UNDO) setHistory((stack) => undoHistory(stack));
      if (id === COMMAND_ID.REDO) setHistory((stack) => redoHistory(stack));
      if (id === COMMAND_ID.PRESENT) setPresenting((value) => !value);
      if (id === COMMAND_ID.FIT) void fitView({ padding: 0.2 });
      if (id === COMMAND_ID.EXPORT_SVG || id === COMMAND_ID.EXPORT_JSON) setExportOpen(true);
      if (id === COMMAND_ID.DELETE) deleteSelection();
      if (id === COMMAND_ID.DUPLICATE) duplicateSelection();
      if (id === COMMAND_ID.ALIGN_LEFT) alignSelection(ALIGN_KIND.LEFT);
      if (id === COMMAND_ID.ALIGN_RIGHT) alignSelection(ALIGN_KIND.RIGHT);
      if (id === COMMAND_ID.ALIGN_TOP) alignSelection(ALIGN_KIND.TOP);
      if (id === COMMAND_ID.ALIGN_BOTTOM) alignSelection(ALIGN_KIND.BOTTOM);
      if (id === COMMAND_ID.ARRANGE) void startArrange();
      if (id === COMMAND_ID.CONNECT) connectSelected();
      if (id === COMMAND_ID.NEW) setSurface("start");
    },
    [alignSelection, applyOp, connectSelected, deleteSelection, duplicateSelection, exportFormat, fitView, presenting, startArrange, theme],
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
    if (presenting) return;
    if (!connection.source || !connection.target) return;
    if (connection.source === connection.target) {
      setEditError("Self-loops are not supported. Connect two different nodes.");
      return;
    }
    setPending({
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle ?? null,
      targetHandle: connection.targetHandle ?? null,
    });
  }, [presenting]);

  if (!booted) {
    return <p>Loading workspace…</p>;
  }

  if (surface === "start") {
    return (
      <div className="app">
        <StartSurface
          importError={importError}
          recents={recents}
          onNewBlank={() => {
            const document = blankDocument();
            openSnapshot({ document, positions: {} });
          }}
          onOpenExample={(id) => {
            const example = EXAMPLES.find((item) => item.id === id);
            if (!example) return;
            const next = snapshotFromStored({ document: example.document });
            if (next) openSnapshot(next);
          }}
          onOpenRecent={(id) => {
            void persistStore.current.load(id).then((stored) => {
              if (stored) openSnapshot(stored);
            });
          }}
          onImportFile={(file) => {
            void file.text().then((text) => {
              const result = importDocumentText(text);
              if ("error" in result) {
                setImportError(result.error);
                return;
              }
              openSnapshot(result.snapshot);
            });
          }}
        />
      </div>
    );
  }

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
    <EditorErrorBoundary
      snapshot={snapshot}
      onReturnToLibrary={() => {
        setSurface("start");
        setEditingId(null);
        setArrange({ status: "idle" });
      }}
    >
    <div className={presenting ? "app is-presenting" : "app"}>
      <TopBar
        title={documentModel.title}
        saveState={saveState}
        onBackup={() => {
          if (!snapshot) return;
          download("diagram.json", backupBytes(snapshot), "application/json");
        }}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        presenting={presenting}
        chatOpen={chatOpen}
        onTitleCommit={(value) => applyOp({ kind: OPERATION_KIND.SET_TITLE, title: value })}
        onUndo={() => runCommand(COMMAND_ID.UNDO)}
        onRedo={() => runCommand(COMMAND_ID.REDO)}
        onNew={() => runCommand(COMMAND_ID.NEW)}
        onArrange={() => runCommand(COMMAND_ID.ARRANGE)}
        onPresent={() => runCommand(COMMAND_ID.PRESENT)}
        onExport={() => setExportOpen(true)}
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
        <div className={arrange.status === "preview" ? "canvas is-previewing" : "canvas"}>
          <ReactFlow
            nodes={nodes}
            edges={rfEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onConnect={onConnect}
            nodesDraggable={arrange.status === "idle" && !presenting}
            nodesConnectable={arrange.status === "idle" && !presenting}
            onNodeDragStart={onNodeDragStart}
            onNodeDragStop={onNodeDragStop}
            onSelectionChange={onSelectionChange}
            onPaneClick={(event) => {
              const target = event.target;
              if (target instanceof Element && target.closest(".node-card, .group-frame, .label-input")) {
                return;
              }
              if (!presenting) setSelection(emptySelection);
              setEditingId(null);
            }}
            onNodeDoubleClick={(_event, node) => {
              if (!presenting) setEditingId(node.id);
            }}
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
          <ExportDialog
            open={exportOpen}
            theme={theme}
            error={exportError}
            onTheme={setTheme}
            onExport={exportFormat}
            onClose={() => setExportOpen(false)}
          />
          {presenting ? null : (
            <AddBar onAddNode={addNode} onAddGroup={addGroup} onConnect={connectSelected} />
          )}
          <ArrangeBar state={arrange} onApply={applyArrange} onDiscard={discardArrange} />
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
    </EditorErrorBoundary>
  );
}

export function App() {
  return (
    <ReactFlowProvider>
      <Specimen />
    </ReactFlowProvider>
  );
}
