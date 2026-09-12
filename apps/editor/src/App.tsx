import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import {
  Background,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type ReactFlowInstance,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import {
  DOCUMENT_KIND,
  VIEW_KIND,
  EDGE_DIRECTION,
  EDGE_TYPE,
  EDGES_FOR_KIND,
  NODE_KIND,
  defaultEdgeType,
  OPERATION_KIND,
  THEME,
  applyOperation,
  applyPortableLayout,
  nextPrefixedId,
  portablePositions,
  type DiagramDocument,
  type DocumentKind,
  type NodeKind,
  type Operation,
  type Theme,
} from "@mapgrain/document";
import { LAYOUT_STATUS } from "@mapgrain/layout/run";
import { EXPORT_FORMAT, exportVector } from "@mapgrain/renderer/vector";
import {
  buildScene,
  localOverlapRepair,
  overlappingIds,
  presentKinds,
  presentationCssVars,
} from "@mapgrain/scene";
import type { Point } from "@mapgrain/scene";
import { renderView } from "@mapgrain/viewer";
import { ExportDialog } from "./chrome/ExportDialog.tsx";
import { EXPORT_CHOICE } from "./constants/export.ts";
import { STORY_WEBM } from "./constants/video.ts";
import { copyPngToClipboard, RASTER_TYPE, rasterSvgToPng } from "./export/png.ts";
import { storyExportFrames } from "./export/storyFrames.ts";
import { encodeStoryWebm, STORY_WEBM_CANCELLED, STORY_WEBM_NO_STORY } from "./export/webm.ts";
import { ArrangeBar } from "./chrome/ArrangeBar.tsx";
import { SHELL_LAYOUT } from "./constants/layout.ts";
import { USER_MAX_ZOOM, USER_MIN_ZOOM, fitAllOptions, readableFitOptions } from "./constants/diagram.ts";
import { ViewportBar } from "./chrome/ViewportBar.tsx";
import { KindLegend } from "./diagram/KindLegend.tsx";
import { shellLayoutForWidth, useViewportWidth } from "./chrome/viewport.ts";
import { StartSurface } from "./chrome/StartSurface.tsx";
import { CommandMenu } from "./chrome/CommandMenu.tsx";
import { HelpOverlay } from "./chrome/HelpOverlay.tsx";
import { ConnectDialog } from "./chrome/ConnectDialog.tsx";
import { ConvertKindDialog } from "./chrome/ConvertKindDialog.tsx";
import { Inspector } from "./chrome/Inspector.tsx";
import { Outline } from "./chrome/Outline.tsx";
import { TopBar } from "./chrome/TopBar.tsx";
import { ALIGN_KIND } from "./constants/align.ts";
import { COMMAND_ID, type CommandId } from "./constants/commands.ts";
import { DUPLICATE_OFFSET, NODE_DRAG_THRESHOLD } from "./constants/edit.ts";
import { AddBar } from "./chrome/AddBar.tsx";
import { CanvasEmpty } from "./chrome/CanvasEmpty.tsx";
import { WalkBar } from "./chrome/WalkBar.tsx";
import { deriveWalkthrough } from "./walkthrough/derive.ts";
import { blankDocument } from "./create/blank.ts";
import { addableKinds, makeNode } from "./create/nodes.ts";
import { AUTOSAVE_MS, PERSIST_ERROR_CODE, SAVE_STATE } from "./constants/persist.ts";
import { PersistError, persistErrorMessage } from "./persist/errors.ts";
import { setOfflineUpdateAllowed } from "./offline/register.ts";
import { createSaveSession, type SaveSession } from "./persist/session.ts";
import { ComponentNode } from "./diagram/ComponentNode.tsx";
import { GroupNode } from "./diagram/GroupNode.tsx";
import { LifelineLayer } from "./diagram/LifelineLayer.tsx";
import { RelationEdge } from "./diagram/RelationEdge.tsx";
import { sceneToFlow } from "./diagram/sceneToFlow.ts";
import { alignPositions } from "./geometry/align.ts";
import { positionsFromFlow, samePositions } from "./geometry/positions.ts";
import { createHistory, pushHistory, redoHistory, undoHistory } from "./history/stack.ts";
import { reuseUnchangedEdges, reuseUnchangedNodes } from "./edit/flowNodes.ts";
import { indexById } from "./edit/indexes.ts";
import {
  commandAllowed,
  layoutToken,
  layoutTokenMatches,
  selectionFromFlow,
} from "./edit/safety.ts";
import { retainFlowSelection } from "./edit/selection.ts";
import { EditorErrorBoundary } from "./chrome/ErrorBoundary.tsx";
import {
  isDeleteEvent,
  isDuplicateEvent,
  isRedoEvent,
  isUndoEvent,
} from "./keyboard/editShortcut.ts";
import { commandForKeyEvent, shouldOpenCommandMenu, shouldOpenHelp } from "./keyboard/commandShortcut.ts";
import { BrowserLayoutEngine } from "./layout/browserEngine.ts";
import { mergePositions, pinsFromDocument } from "./layout/pins.ts";
import { findTemplate } from "./templates/catalog.ts";
import { snapshotFromTemplate } from "./templates/open.ts";
import { MODE_CHOICES } from "./create/modes.ts";
import { importDocumentText } from "./create/importDocument.ts";
import { freeSpotNear, groupForNewNode } from "./edit/placement.ts";
import { kindTitle } from "./constants/kind.ts";
import { editMessage } from "./edit/editMessage.ts";
import { LoadFailure } from "./chrome/LoadFailure.tsx";
import { backupBytes } from "./persist/codec.ts";
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
import type { PersistStore, RecentDocument, SaveState } from "./types/persist.ts";
import type { ComponentNodeData, FlowNodeDraft, GroupNodeData } from "./types/flow.ts";

const nodeTypes = { component: ComponentNode, group: GroupNode };
const edgeTypes = { relation: RelationEdge };
const emptySelection: EditorSelection = { nodeIds: [], edgeIds: [] };
const PRO_OPTIONS = { hideAttribution: true } as const;

function defaultStore(): PersistStore {
  const studio = readStudioConfig();
  if (studio) return studioStore(studio);
  return globalThis.indexedDB ? indexedDbStore() : memoryStore();
}

// Seeds the history before a stored document loads. The boot effect shows the start
// surface until then, so this is a placeholder rather than a document anyone sees, and it
// must not be a test fixture.
function loadSnapshot(): EditorSnapshot {
  return { document: blankDocument(), positions: {} };
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

function pickJsonFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = globalThis.document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
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
    case OPERATION_KIND.SET_NODE_KIND:
      return document.nodes.find((node) => node.id === operation.nodeId)?.kind === operation.nodeKind;
    case OPERATION_KIND.SET_NODE_MARKER:
      return (document.nodes.find((node) => node.id === operation.nodeId)?.marker ?? null) === operation.marker;
    case OPERATION_KIND.SET_EDGE_ORDER:
      return (document.edges.find((edge) => edge.id === operation.edgeId)?.order ?? null) === operation.order;
    case OPERATION_KIND.SET_EDGE_GUARD:
      return (document.edges.find((edge) => edge.id === operation.edgeId)?.guard ?? "") === operation.guard;
    case OPERATION_KIND.SET_EDGE_OUTCOME:
      return (document.edges.find((edge) => edge.id === operation.edgeId)?.outcome ?? "") === operation.outcome;
    case OPERATION_KIND.SET_LAYOUT:
      return JSON.stringify(portablePositions(document)) === JSON.stringify(operation.positions);
    case OPERATION_KIND.SET_THEME:
      return document.theme === operation.theme;
    case OPERATION_KIND.SET_DOCUMENT_KIND:
      return !operation.restore && document.kind === operation.documentKind;
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
            lane: node.data.lane,
            editing: editingId === node.id,
            onStartEdit: () => onStartEdit(node.id),
            onCommitLabel: (label: string) => onCommitLabel(node.id, "group", label),
            onCancelEdit,
          } satisfies GroupNodeData)
        : ({
            kind: node.data.kind ?? "service",
            kindLabel: node.data.kindLabel ?? (node.data.kind ?? "service").toUpperCase(),
            label: node.data.label,
            lines: node.data.lines,
            ports: node.data.ports,
            marker: node.data.marker,
            stateTone: node.data.stateTone,
            kindFill: node.data.kindFill,
            shape: node.data.shape,
            editing: editingId === node.id,
            onStartEdit: () => onStartEdit(node.id),
            onCommitLabel: (label: string) => onCommitLabel(node.id, "component", label),
            onCancelEdit,
          } satisfies ComponentNodeData),
  }));
}

function Editor() {
  const { fitView, getNodes, screenToFlowPosition } = useReactFlow();
  const initial = useMemo(loadSnapshot, []);
  const [theme, setTheme] = useState<Theme>(() =>
    globalThis.matchMedia?.("(prefers-color-scheme: light)").matches ? THEME.LIGHT : THEME.DARK,
  );
  const [selection, setSelection] = useState<EditorSelection>({ nodeIds: ["gateway"], edgeIds: [] });
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [narrowPanel, setNarrowPanel] = useState<"outline" | "inspector" | "none">("none");
  const [presenting, setPresenting] = useState(false);
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [walkIndex, setWalkIndex] = useState<number | null>(null);
  const [pending, setPending] = useState<PendingConnection | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [arrange, setArrange] = useState<ArrangeState>({ status: "idle" });
  const [booted, setBooted] = useState(false);
  const [surface, setSurface] = useState<WorkspaceSurface>("start");
  const [hasEditorSession, setHasEditorSession] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [recents, setRecents] = useState<RecentDocument[]>([]);
  const [saveState, setSaveState] = useState<SaveState>(SAVE_STATE.SAVED);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertTarget, setConvertTarget] = useState<DocumentKind>(DOCUMENT_KIND.WORKFLOW);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const exportAbort = useRef<AbortController | null>(null);
  const [collision, setCollision] = useState<{
    nodeId: string;
    neighborIds: string[];
    positions: PositionMap;
  } | null>(null);
  const [history, setHistory] = useState(() => createHistory(initial));
  const historyRef = useRef(history);
  historyRef.current = history;
  const layoutEngine = useRef<BrowserLayoutEngine | null>(null);
  const persistStore = useRef<PersistStore>(defaultStore());
  const saveSession = useRef<SaveSession | null>(null);
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
          setHasEditorSession(true);
        }
        skipNextSave.current = true;
        setBooted(true);
      })
      .catch((error) => {
        if (cancelled) return;
        bootRecovery.current = true;
        skipNextSave.current = true;
        const message =
          error instanceof PersistError
            ? persistErrorMessage(error.code)
            : persistErrorMessage(PERSIST_ERROR_CODE.IO);
        setSaveError(message);
        setImportError(message);
        setBooted(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const session = createSaveSession({
      store: persistStore.current,
      delayMs: AUTOSAVE_MS,
      fileBacked: Boolean(readStudioConfig()),
      onState: setSaveState,
      onError: setSaveError,
    });
    saveSession.current = session;
    return () => session.dispose();
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
    setSaveError(null);
    saveSession.current?.schedule(snapshot);
  }, [booted, snapshot, surface]);

  useEffect(() => {
    setOfflineUpdateAllowed(
      saveState !== SAVE_STATE.SAVING &&
        saveState !== SAVE_STATE.FILE_SAVING &&
        saveState !== SAVE_STATE.RECOVERY,
    );
  }, [saveState]);

  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (saveState === SAVE_STATE.SAVING || saveState === SAVE_STATE.FILE_SAVING) {
        event.preventDefault();
        event.returnValue = "";
      }
      void saveSession.current?.flush();
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [saveState]);

  const flushThen = useCallback((next: () => void, evenIfFailed = false) => {
    const run = saveSession.current?.flush() ?? Promise.resolve();
    if (evenIfFailed) {
      void run.finally(next);
      return;
    }
    void run.then(next, () => undefined);
  }, []);

  const openSnapshot = useCallback((next: EditorSnapshot, options?: { skipSave?: boolean }) => {
    skipNextSave.current = Boolean(options?.skipSave);
    setArrange({ status: "idle" });
    setTheme(next.document.theme);
    setHistory(createHistory(next));
    setSelection({
      nodeIds: next.document.nodes[0] ? [next.document.nodes[0].id] : [],
      edgeIds: [],
    });
    setSurface("editor");
    setHasEditorSession(true);
    setImportError(null);
  }, []);

  const returnToLibrary = useCallback(() => {
    flushThen(() => {
      setSurface("start");
      setEditingId(null);
      setArrange({ status: "idle" });
    }, true);
  }, [flushThen]);

  const importFromFile = useCallback(() => {
    void pickJsonFile().then(async (file) => {
      if (!file) return;
      const result = importDocumentText(await file.text());
      if ("error" in result) {
        setEditError(result.error);
        return;
      }
      flushThen(() => openSnapshot(result.snapshot));
    });
  }, [flushThen, openSnapshot]);

  useEffect(() => {
    void persistStore.current.list().then(setRecents);
  }, [booted, surface, documentModel?.id, documentModel?.title, saveState]);

  const displayPositions = useMemo(
    () => (arrange.status === "preview" ? arrange.positions : (snapshot?.positions ?? {})),
    [arrange, snapshot],
  );

  const scene = useMemo(
    () => (documentModel ? buildScene(documentModel, { positions: displayPositions }) : null),
    [documentModel, displayPositions],
  );
  const flow = useMemo(() => {
    if (!scene?.ok) return { nodes: [] as FlowNodeDraft[], edges: [], lifelines: [], fragments: [] };
    return sceneToFlow(scene.scene);
  }, [scene]);

  const cancelEdit = useCallback(() => setEditingId(null), []);
  const [nodes, setNodes] = useState<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);

  const walkSteps = useMemo(
    () => (documentModel ? deriveWalkthrough(documentModel) : []),
    [documentModel],
  );
  const walkStep = walkIndex === null ? null : (walkSteps[walkIndex] ?? null);

  const computedEdges = useMemo<Edge[]>(() => {
    if (!documentModel) return [];
    const selected = new Set(selection.edgeIds);
    const meaningById = indexById(documentModel.edges);
    return flow.edges.map((edge) => {
      const meaning = meaningById.get(edge.id);
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
          caption: edge.caption,
          labelAnchor: edge.labelAnchor,
          labelSize: edge.labelSize,
          preserveGeometry: edge.preserveGeometry,
          walkStep: walkStep?.edgeId === edge.id,
          dragging,
        },
        ...(walkStep?.edgeId === edge.id ? { className: "is-walk-step" } : {}),
      };
    });
  }, [documentModel, dragging, flow.edges, selection.edgeIds, walkStep]);
  const rfEdges = reuseUnchangedEdges(edgesRef.current, computedEdges);
  edgesRef.current = rfEdges;

  const selectedNode = flow.nodes.find((node) => node.id === selection.nodeIds[0]) ?? null;
  const selectedEdge =
    documentModel?.edges.find((edge) => edge.id === selection.edgeIds[0]) ?? null;
  const inspectorWanted = Boolean((selectedNode || selectedEdge) && !presenting);
  const viewportWidth = useViewportWidth();
  const shellLayout = shellLayoutForWidth(viewportWidth);
  const showOutline =
    !presenting &&
    (shellLayout === SHELL_LAYOUT.SPLIT ? outlineOpen : narrowPanel === "outline");
  const showInspector =
    inspectorWanted &&
    (shellLayout === SHELL_LAYOUT.SPLIT ? inspectorOpen : narrowPanel === "inspector");

  useEffect(() => {
    if (shellLayout === SHELL_LAYOUT.SPLIT) return;
    if (!selection.nodeIds[0] && !selection.edgeIds[0]) {
      setNarrowPanel((current) => (current === "inspector" ? "none" : current));
    }
  }, [selection.nodeIds, selection.edgeIds, shellLayout]);

  useLayoutEffect(() => {
    globalThis.document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!presenting) return;
    const outer = requestAnimationFrame(() => {
      requestAnimationFrame(() => void fitView(fitAllOptions()));
    });
    return () => cancelAnimationFrame(outer);
  }, [presenting, fitView]);

  // Opening or closing a narrow-width pane resizes the canvas, so refit into it.
  useEffect(() => {
    if (shellLayout === SHELL_LAYOUT.SPLIT) return;
    const outer = requestAnimationFrame(() => {
      requestAnimationFrame(() => void fitView(fitAllOptions()));
    });
    return () => cancelAnimationFrame(outer);
  }, [narrowPanel, shellLayout, fitView]);

  useEffect(() => {
    if (arrange.status !== "preview") return;
    const outer = requestAnimationFrame(() => {
      requestAnimationFrame(() => void fitView(readableFitOptions()));
    });
    return () => cancelAnimationFrame(outer);
  }, [arrange.status, fitView, nodes]);

  const applyOp = useCallback((operation: Operation, nextPositions?: PositionMap) => {
    if (presenting) return false;
    const current = historyRef.current.present;
    if (isNoOp(current.document, operation)) return true;
    const result = applyOperation(current.document, operation);
    if (!result.ok) {
      setEditError(editMessage(result.errors[0]?.message ?? "Invalid edit"));
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
    if (operation.kind === OPERATION_KIND.SET_NODE_LABEL) {
      const nextScene = buildScene(document, { positions });
      if (nextScene.ok) {
        const neighborIds = overlappingIds(nextScene.scene.nodes, operation.nodeId);
        if (neighborIds.length > 0) {
          const repair = localOverlapRepair(
            nextScene.scene.nodes,
            operation.nodeId,
            document.layoutHints.pinnedNodeIds,
          );
          setCollision(
            repair
              ? { nodeId: operation.nodeId, neighborIds, positions: repair }
              : { nodeId: operation.nodeId, neighborIds, positions },
          );
        } else {
          setCollision(null);
        }
      }
    } else {
      setCollision(null);
    }
    return true;
  }, [presenting]);

  const viewportCenter = useCallback((): Point => {
    const canvas = globalThis.document?.querySelector(".canvas");
    const box = canvas?.getBoundingClientRect();
    if (!box || box.width === 0) return { x: 0, y: 0 };
    return screenToFlowPosition({ x: box.left + box.width / 2, y: box.top + box.height / 2 });
  }, [screenToFlowPosition]);

  const addNode = useCallback(
    (kind: NodeKind) => {
      const current = historyRef.current.present;
      const id = nextPrefixedId("n", usedIds(current.document));
      const groupId = groupForNewNode(current.document, selection.nodeIds[0]);
      const node = { ...makeNode(id, kind, kindTitle(kind)), groupId };
      const positions = {
        ...current.positions,
        [id]: freeSpotNear(current.document, current.positions, viewportCenter()),
      };
      if (!applyOp({ kind: OPERATION_KIND.ADD_NODE, node }, positions)) return;
      setSelection({ nodeIds: [id], edgeIds: [] });
      setEditingId(id);
    },
    [applyOp, selection.nodeIds, viewportCenter],
  );

  const addGroup = useCallback(() => {
    const current = historyRef.current.present;
    const id = nextPrefixedId("g", usedIds(current.document));
    const label = current.document.kind === DOCUMENT_KIND.WORKFLOW ? "Lane" : "Group";
    if (!applyOp({ kind: OPERATION_KIND.ADD_GROUP, id, label })) return;
    setSelection({ nodeIds: [id], edgeIds: [] });
    setEditingId(id);
  }, [applyOp]);

  const connectSelected = useCallback(() => {
    const ids = selection.nodeIds.filter((id) =>
      historyRef.current.present.document.nodes.some((node) => node.id === id),
    );
    if (ids.length < 2 || !ids[0] || !ids[1]) return;
    const current = historyRef.current.present;
    const edgeId = nextPrefixedId("e", usedIds(current.document));
    const sourceNode = current.document.nodes.find((node) => node.id === ids[0]);
    const type =
      sourceNode?.kind === NODE_KIND.DECISION
        ? EDGE_TYPE.OUTCOME
        : defaultEdgeType(current.document.kind);
    const orders = current.document.edges
      .map((edge) => edge.order)
      .filter((value): value is number => typeof value === "number");
    applyOp({
      kind: OPERATION_KIND.ADD_EDGE,
      id: edgeId,
      source: { nodeId: ids[0], portId: "out" },
      target: { nodeId: ids[1], portId: "in" },
      type,
      direction: EDGE_DIRECTION.FORWARD,
      ...(current.document.kind === DOCUMENT_KIND.SEQUENCE
        ? { order: (orders.length > 0 ? Math.max(...orders) : 0) + 1 }
        : {}),
      ...(sourceNode?.kind === NODE_KIND.DECISION ? { outcome: "yes" } : {}),
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

  const startWalk = useCallback(() => {
    if (deriveWalkthrough(historyRef.current.present.document).length === 0) {
      setEditError("There is nothing to walk through yet. Add a component first.");
      return;
    }
    setEditingId(null);
    setWalkIndex(0);
  }, []);

  // Reading follows the diagram, so each step brings its node into view.
  useEffect(() => {
    if (!walkStep) return;
    const target = getNodes().filter((node) => node.id === walkStep.nodeId);
    if (target.length === 0) return;
    void fitView({ ...readableFitOptions(), nodes: target, duration: 180 });
  }, [walkStep, fitView, getNodes]);

  const derivedNodes = useMemo(() => {
    const built = toFlow(flow.nodes, selection.nodeIds, editingId, setEditingId, commitLabel, cancelEdit);
    if (!walkStep) return built;
    return built.map((node) =>
      node.id === walkStep.nodeId ? { ...node, className: "is-walk-step" } : node,
    );
  }, [flow.nodes, selection.nodeIds, editingId, commitLabel, cancelEdit, walkStep]);

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

  const onPaneClick = useCallback((event: ReactMouseEvent) => {
    const target = event.target;
    if (target instanceof Element && target.closest(".node-card, .group-frame, .label-input")) return;
    if (!presenting) setSelection(emptySelection);
    setEditingId(null);
  }, [presenting]);

  const onNodeDoubleClick = useCallback((_event: ReactMouseEvent, node: Node) => {
    if (!presenting) setEditingId(node.id);
  }, [presenting]);

  const onNodeMouseEnter = useCallback((event: ReactMouseEvent, node: Node) => {
    const box = (event.currentTarget as HTMLElement).closest(".canvas")?.getBoundingClientRect();
    setTooltip({
      x: event.clientX - (box?.left ?? 0) + 12,
      y: event.clientY - (box?.top ?? 0) + 12,
      text: String(node.data.label ?? node.id),
    });
  }, []);

  const onNodeMouseLeave = useCallback(() => setTooltip(null), []);

  const onFlowInit = useCallback((instance: ReactFlowInstance) => {
    void instance.fitView(fitAllOptions());
  }, []);

  const onSelectionChange = useCallback(({ nodes: selectedNodes, edges: selectedEdges }: OnSelectionChangeParams) => {
    const next = selectionFromFlow(selectedNodes, selectedEdges);
    setSelection((current) => retainFlowSelection(current, next));
    if (shellLayout !== SHELL_LAYOUT.SPLIT && (next.nodeIds.length > 0 || next.edgeIds.length > 0)) {
      setNarrowPanel("inspector");
    }
  }, [shellLayout]);

  const pushPositions = useCallback((positions: PositionMap) => {
    const current = historyRef.current.present;
    if (samePositions(current.positions, positions)) return;
    applyOp({ kind: OPERATION_KIND.SET_LAYOUT, positions }, positions);
  }, [applyOp]);

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
    void fitView(readableFitOptions());
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
        setEditError(editMessage(result.errors[0]?.message ?? "Invalid edit"));
        return;
      }
      nextDoc = result.document;
      delete positions[nodeId];
    }
    for (const edgeId of selection.edgeIds) {
      if (!nextDoc.edges.some((edge) => edge.id === edgeId)) continue;
      const result = applyOperation(nextDoc, { kind: OPERATION_KIND.DELETE_EDGE, edgeId });
      if (!result.ok) {
        setEditError(editMessage(result.errors[0]?.message ?? "Invalid edit"));
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
        setEditError(editMessage(result.errors[0]?.message ?? "Invalid edit"));
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
    const orders = current.document.edges
      .map((edge) => edge.order)
      .filter((value): value is number => typeof value === "number");
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
      ...(current.document.kind === DOCUMENT_KIND.SEQUENCE
        ? { order: (orders.length > 0 ? Math.max(...orders) : 0) + 1 }
        : {}),
    });
    if (ok) setSelection({ nodeIds: [], edgeIds: [id] });
    setPending(null);
  }, [applyOp, pending]);

  const exportFormat = useCallback(
    (format: (typeof EXPORT_CHOICE)[keyof typeof EXPORT_CHOICE], scale = 1) => {
      if (!documentModel || exportBusy) return;
      void (async () => {
        if (format === EXPORT_CHOICE.STORY_WEBM) {
          const frames = storyExportFrames(documentModel);
          if (frames.length === 0) {
            setExportError(STORY_WEBM_NO_STORY);
            return;
          }
          const controller = new AbortController();
          exportAbort.current = controller;
          setExportBusy(true);
          setExportError(null);
          try {
            const pngs: Uint8Array[] = [];
            for (const frame of frames) {
              if (controller.signal.aborted) break;
              const vector = exportVector({
                document: documentModel,
                format: EXPORT_FORMAT.SVG,
                theme,
                nodeIds: frame.nodeIds,
              });
              if (!vector.ok) {
                setExportError(vector.errors[0]?.message ?? "Export failed");
                return;
              }
              const raster = await rasterSvgToPng(
                new TextDecoder().decode(vector.bytes),
                vector.width ?? 1,
                vector.height ?? 1,
                1,
                RASTER_TYPE.PNG,
              );
              if (!raster.ok) {
                setExportError(raster.message);
                return;
              }
              pngs.push(raster.bytes);
            }
            const encoded = await encodeStoryWebm(pngs, { signal: controller.signal });
            if (!encoded.ok) {
              setExportError(encoded.message === STORY_WEBM_CANCELLED ? null : encoded.message);
              return;
            }
            download(STORY_WEBM.filename, encoded.bytes, STORY_WEBM.mimeType);
          } finally {
            setExportBusy(false);
            exportAbort.current = null;
          }
          return;
        }
        if (
          format === EXPORT_CHOICE.PNG ||
          format === EXPORT_CHOICE.JPEG ||
          format === EXPORT_CHOICE.WEBP ||
          format === EXPORT_CHOICE.CLIPBOARD
        ) {
          const vector = exportVector({
            document: documentModel,
            format: EXPORT_FORMAT.SVG,
            theme,
          });
          if (!vector.ok) {
            setExportError(vector.errors[0]?.message ?? "Export failed");
            return;
          }
          const type =
            format === EXPORT_CHOICE.JPEG
              ? RASTER_TYPE.JPEG
              : format === EXPORT_CHOICE.WEBP
                ? RASTER_TYPE.WEBP
                : RASTER_TYPE.PNG;
          const raster = await rasterSvgToPng(
            new TextDecoder().decode(vector.bytes),
            vector.width ?? 1,
            vector.height ?? 1,
            scale,
            type,
          );
          if (!raster.ok) {
            setExportError(raster.message);
            return;
          }
          if (format === EXPORT_CHOICE.CLIPBOARD) {
            const copied = await copyPngToClipboard(raster.bytes);
            setExportError(copied.ok ? null : copied.message);
            return;
          }
          setExportError(null);
          const name =
            format === EXPORT_CHOICE.JPEG
              ? "diagram.jpg"
              : format === EXPORT_CHOICE.WEBP
                ? "diagram.webp"
                : "diagram.png";
          download(name, raster.bytes, type);
          return;
        }
        if (format === EXPORT_CHOICE.HTML) {
          const view = renderView(documentModel, theme);
          if (!view.ok) {
            setExportError(view.errors[0]?.message ?? "Export failed");
            return;
          }
          setExportError(null);
          download("diagram.html", new TextEncoder().encode(view.html), "text/html");
          return;
        }
        const result = exportVector({ document: documentModel, format, theme });
        if (!result.ok) {
          setExportError(result.errors[0]?.message ?? "Export failed");
          return;
        }
        setExportError(null);
        const name = format === EXPORT_CHOICE.JSON ? "diagram.json" : "diagram.svg";
        download(name, result.bytes, result.mediaType);
      })();
    },
    [documentModel, theme, exportBusy],
  );

  const runCommand = useCallback(
    (id: CommandId) => {
      if (!commandAllowed(presenting, id)) return;
      if (id === COMMAND_ID.TOGGLE_THEME) {
        const next = theme === THEME.DARK ? THEME.LIGHT : THEME.DARK;
        setTheme(next);
        applyOp({ kind: OPERATION_KIND.SET_THEME, theme: next });
      }
      if (id === COMMAND_ID.TOGGLE_OUTLINE) {
        if (shellLayout === SHELL_LAYOUT.SPLIT) setOutlineOpen((value) => !value);
        else setNarrowPanel((value) => (value === "outline" ? "none" : "outline"));
      }
      if (id === COMMAND_ID.UNDO) setHistory((stack) => undoHistory(stack));
      if (id === COMMAND_ID.REDO) setHistory((stack) => redoHistory(stack));
      if (id === COMMAND_ID.PRESENT) setPresenting((value) => !value);
      if (id === COMMAND_ID.FIT_ALL) void fitView(fitAllOptions());
      if (id === COMMAND_ID.FOCUS) {
        const selected = getNodes().filter((node) => selection.nodeIds.includes(node.id));
        void fitView(
          selected.length > 0 ? { ...readableFitOptions(), nodes: selected } : readableFitOptions(),
        );
      }
      if (id === COMMAND_ID.TOGGLE_INSPECTOR) {
        if (shellLayout === SHELL_LAYOUT.SPLIT) setInspectorOpen((value) => !value);
        else setNarrowPanel((value) => (value === "inspector" ? "none" : "inspector"));
      }
      if (id === COMMAND_ID.EXPORT || id === COMMAND_ID.EXPORT_SVG || id === COMMAND_ID.EXPORT_JSON) {
        setExportOpen(true);
      }
      if (id === COMMAND_ID.DELETE) deleteSelection();
      if (id === COMMAND_ID.DUPLICATE) duplicateSelection();
      if (id === COMMAND_ID.ALIGN_LEFT) alignSelection(ALIGN_KIND.LEFT);
      if (id === COMMAND_ID.ALIGN_RIGHT) alignSelection(ALIGN_KIND.RIGHT);
      if (id === COMMAND_ID.ALIGN_TOP) alignSelection(ALIGN_KIND.TOP);
      if (id === COMMAND_ID.ALIGN_BOTTOM) alignSelection(ALIGN_KIND.BOTTOM);
      if (id === COMMAND_ID.ARRANGE) void startArrange();
      if (id === COMMAND_ID.CONNECT) connectSelected();
      if (id === COMMAND_ID.NEW) flushThen(() => setSurface("start"));
      if (id === COMMAND_ID.IMPORT) importFromFile();
      if (id === COMMAND_ID.WALK) startWalk();
      if (id === COMMAND_ID.HELP) {
        setCommandsOpen(false);
        setHelpOpen(true);
      }
      if (id === COMMAND_ID.CONVERT_KIND && documentModel) {
        const nextKind =
          MODE_CHOICES.find((choice) => choice.kind !== documentModel.kind)?.kind ?? documentModel.kind;
        setConvertTarget(nextKind);
        setConvertOpen(true);
      }
    },
    [alignSelection, applyOp, connectSelected, deleteSelection, duplicateSelection, documentModel, fitView, flushThen, getNodes, importFromFile, presenting, selection.nodeIds, shellLayout, startArrange, startWalk, theme],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (walkIndex !== null) {
          setWalkIndex(null);
          return;
        }
        if (helpOpen) {
          setHelpOpen(false);
          return;
        }
        if (commandsOpen) {
          setCommandsOpen(false);
          return;
        }
        if (exportOpen) {
          setExportOpen(false);
          return;
        }
        if (pending) {
          setPending(null);
          return;
        }
        if (editingId) {
          setEditingId(null);
          return;
        }
        if (narrowPanel !== "none") {
          setNarrowPanel("none");
          return;
        }
      }
      if (shouldOpenCommandMenu(event)) {
        event.preventDefault();
        setHelpOpen(false);
        setCommandsOpen(true);
        return;
      }
      if (shouldOpenHelp(event)) {
        event.preventDefault();
        setCommandsOpen(false);
        setHelpOpen((open) => !open);
        return;
      }
      const keyCommand = commandForKeyEvent(event);
      if (keyCommand) {
        event.preventDefault();
        runCommand(keyCommand);
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
  }, [commandsOpen, editingId, exportOpen, helpOpen, narrowPanel, pending, runCommand, walkIndex]);

  // The scene owns geometry and this component owns selection, so only a drag comes back
  // from React Flow. Feeding its own measurements back in made the two stores chase each
  // other until React gave up with a maximum update depth error.
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
    if (
      connection.source === connection.target &&
      historyRef.current.present.document.kind !== DOCUMENT_KIND.SEQUENCE
    ) {
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
      <div className="app is-start">
        <StartSurface
          importError={importError}
          recents={recents}
          canReturn={hasEditorSession && Boolean(documentModel)}
          onBack={() => {
            setImportError(null);
            setSurface("editor");
          }}
          onNewBlank={(kind?: DocumentKind) => {
            flushThen(() => {
              const document = blankDocument(kind);
              openSnapshot({ document, positions: {} });
            });
          }}
          theme={theme}
          onUseTemplate={(id) => {
            flushThen(() => {
              const spec = findTemplate(id);
              if (!spec) {
                setImportError("That template is no longer available.");
                return;
              }
              const result = snapshotFromTemplate(spec);
              if ("error" in result) {
                setImportError(result.error);
                return;
              }
              openSnapshot(result.snapshot);
            });
          }}
          onOpenRecent={(id) => {
            flushThen(() => {
              void persistStore.current
                .load(id)
                .then((stored) => {
                  if (stored) {
                    openSnapshot(stored, { skipSave: true });
                    return;
                  }
                  setImportError("That recent diagram is missing or unreadable.");
                })
                .catch((error) => {
                  setImportError(
                    error instanceof PersistError
                      ? persistErrorMessage(error.code)
                      : "That recent diagram is missing or unreadable.",
                  );
                });
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
        <HelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />
      </div>
    );
  }

  if (!documentModel || !scene?.ok || !snapshot) {
    return (
      <LoadFailure
        issues={scene && !scene.ok ? scene.errors : []}
        snapshot={snapshot}
        onReturnToLibrary={returnToLibrary}
        onDownload={() => {
          if (snapshot) download("diagram.json", backupBytes(snapshot), "application/json");
        }}
      />
    );
  }

  const workspaceClass = [
    "workspace",
    `is-${shellLayout}`,
    showOutline ? "" : "is-outline-collapsed",
    showInspector ? "" : "is-inspector-hidden",
    presenting ? "is-presenting" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <EditorErrorBoundary
      snapshot={snapshot}
      onReturnToLibrary={returnToLibrary}
    >
    <div
      className={["app", presenting ? "is-presenting" : "", walkStep ? "is-walking" : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <TopBar
        title={documentModel.title}
        saveState={saveState}
        saveError={saveError}
        onBackup={() => {
          if (!snapshot) return;
          download("diagram.json", backupBytes(snapshot), "application/json");
        }}
        onRetrySave={() => {
          if (!snapshot) return;
          setSaveError(null);
          saveSession.current?.schedule(snapshot);
          void saveSession.current?.flush();
        }}
        onReloadSaved={() => {
          void persistStore.current
            .load(documentModel.id)
            .then((stored) => {
              if (stored) {
                openSnapshot(stored, { skipSave: true });
                return;
              }
              setSaveState(SAVE_STATE.RECOVERY);
              setSaveError("The saved copy is missing or unreadable. Download this draft.");
            })
            .catch((error) => {
              setSaveState(SAVE_STATE.RECOVERY);
              setSaveError(
                error instanceof PersistError
                  ? persistErrorMessage(error.code)
                  : persistErrorMessage(PERSIST_ERROR_CODE.IO),
              );
            });
        }}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        presenting={presenting}
        onTitleCommit={(value) => applyOp({ kind: OPERATION_KIND.SET_TITLE, title: value })}
        onUndo={() => runCommand(COMMAND_ID.UNDO)}
        onRedo={() => runCommand(COMMAND_ID.REDO)}
        onNew={() => runCommand(COMMAND_ID.NEW)}
        onOpenFile={(file) => {
          void file.text().then((text) => {
            const result = importDocumentText(text);
            if ("error" in result) {
              setSaveError(result.error);
              return;
            }
            openSnapshot(result.snapshot);
          });
        }}
        onArrange={() => runCommand(COMMAND_ID.ARRANGE)}
        onPresent={() => runCommand(COMMAND_ID.PRESENT)}
        onExport={() => setExportOpen(true)}
        onCommand={() => {
          setHelpOpen(false);
          setCommandsOpen(true);
        }}
        onHelp={() => runCommand(COMMAND_ID.HELP)}
        onToggleOutline={() => runCommand(COMMAND_ID.TOGGLE_OUTLINE)}
        onToggleDetails={() => runCommand(COMMAND_ID.TOGGLE_INSPECTOR)}
        onToggleTheme={() => runCommand(COMMAND_ID.TOGGLE_THEME)}
        theme={theme}
      />
      <div className={workspaceClass}>
        {presenting || !showOutline ? null : (
          <Outline
            nodes={flow.nodes}
            selectedId={selection.nodeIds[0] ?? null}
            onSelect={(id, additive) => {
              setSelection((current) => {
                if (additive) {
                  const has = current.nodeIds.includes(id);
                  return {
                    nodeIds: has ? current.nodeIds.filter((item) => item !== id) : [...current.nodeIds, id],
                    edgeIds: [],
                  };
                }
                return { nodeIds: [id], edgeIds: [] };
              });
              if (shellLayout !== SHELL_LAYOUT.SPLIT) setNarrowPanel("inspector");
            }}
            onClose={
              shellLayout === SHELL_LAYOUT.SPLIT
                ? undefined
                : () => setNarrowPanel("none")
            }
          />
        )}
        <div
          className={arrange.status === "preview" ? "canvas is-previewing" : "canvas"}
          style={presentationCssVars(scene.scene.presentation)}
        >
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
            onPaneClick={onPaneClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onNodeMouseEnter={onNodeMouseEnter}
            onNodeMouseLeave={onNodeMouseLeave}
            onInit={onFlowInit}
            deleteKeyCode={null}
            nodeDragThreshold={NODE_DRAG_THRESHOLD}
            minZoom={USER_MIN_ZOOM}
            maxZoom={USER_MAX_ZOOM}
            proOptions={PRO_OPTIONS}
          >
            <Background gap={20} size={1} />
            <LifelineLayer lifelines={flow.lifelines} fragments={flow.fragments} />
            {presenting ? null : (
              <ViewportBar
                canFocus={selection.nodeIds.length > 0}
                onFitAll={() => runCommand(COMMAND_ID.FIT_ALL)}
                onFocus={() => runCommand(COMMAND_ID.FOCUS)}
              />
            )}
          </ReactFlow>
          {documentModel.kind === DOCUMENT_KIND.ARCHITECTURE && !presenting ? (
            <KindLegend kinds={presentKinds(documentModel.nodes.map((node) => node.kind))} />
          ) : null}
          {presenting ? null : (
            <div className="canvas-status">
              {documentModel.views.find((view) => view.kind === VIEW_KIND.OVERVIEW)?.name ??
                documentModel.views[0]?.name ??
                "Overview"}
            </div>
          )}
          {selectedNode && !presenting ? (
            <div className="selection-bar">
              {selectedNode.data.label} selected · Enter to edit
            </div>
          ) : null}
          {shellLayout !== SHELL_LAYOUT.SPLIT && !presenting ? (
            <div className="pane-controls">
              <button type="button" className="text-btn" onClick={() => runCommand(COMMAND_ID.TOGGLE_OUTLINE)}>
                Outline
              </button>
              <button
                type="button"
                className="text-btn"
                onClick={() => runCommand(COMMAND_ID.TOGGLE_INSPECTOR)}
                disabled={!inspectorWanted}
              >
                Details
              </button>
            </div>
          ) : null}
          {tooltip ? (
            <div className="tooltip" style={{ left: tooltip.x, top: tooltip.y }} role="tooltip">
              {tooltip.text}
            </div>
          ) : null}
          {editError ? (
            <div className="edit-error canvas-error" role="alert">
              <span>{editError}</span>
              <button
                type="button"
                className="text-btn ghost"
                aria-label="Dismiss message"
                onClick={() => setEditError(null)}
              >
                ×
              </button>
            </div>
          ) : null}
          <ExportDialog
            open={exportOpen}
            theme={theme}
            error={exportError}
            busy={exportBusy}
            onTheme={setTheme}
            onExport={exportFormat}
            onCancel={() => exportAbort.current?.abort()}
            onClose={() => setExportOpen(false)}
          />
          <ConvertKindDialog
            open={convertOpen}
            document={documentModel}
            target={convertTarget}
            onTarget={setConvertTarget}
            onApply={() => {
              applyOp({ kind: OPERATION_KIND.SET_DOCUMENT_KIND, documentKind: convertTarget });
              setConvertOpen(false);
            }}
            onClose={() => setConvertOpen(false)}
          />
          {presenting ? null : (
            <AddBar
              kinds={addableKinds(documentModel.kind)}
              groupLabel={documentModel.kind === DOCUMENT_KIND.WORKFLOW ? "lane" : "group"}
              onAddNode={addNode}
              onAddGroup={addGroup}
              onConnect={connectSelected}
              canConnect={selection.nodeIds.length >= 2}
            />
          )}
          {documentModel.nodes.length === 0 && !presenting ? (
            <CanvasEmpty
              kindLabel={
                MODE_CHOICES.find((choice) => choice.kind === documentModel.kind)?.title.toLowerCase() ??
                documentModel.kind
              }
              onAdd={() => {
                const first = addableKinds(documentModel.kind)[0];
                if (first) addNode(first);
              }}
            />
          ) : null}
          {walkStep ? (
            <WalkBar
              steps={walkSteps}
              index={walkIndex ?? 0}
              onStep={(next) => setWalkIndex(Math.min(walkSteps.length - 1, Math.max(0, next)))}
              onExit={() => setWalkIndex(null)}
            />
          ) : null}
          <ArrangeBar state={arrange} onApply={applyArrange} onDiscard={discardArrange} />
          {pending ? (
            <ConnectDialog
              pending={pending}
              documentKind={documentModel.kind}
              edgeTypes={EDGES_FOR_KIND[documentModel.kind]}
              onConfirm={confirmConnection}
              onCancel={() => setPending(null)}
            />
          ) : null}
        </div>
        {presenting || !showInspector ? null : (
          <Inspector
            document={documentModel}
            node={selectedEdge ? null : selectedNode}
            edge={selectedEdge}
            error={editError}
            collision={
              collision && selectedNode?.id === collision.nodeId
                ? { neighborIds: collision.neighborIds }
                : null
            }
            onOperate={(operation) => applyOp(operation)}
            onDelete={deleteSelection}
            onDuplicate={duplicateSelection}
            onFocusNode={(id) => setSelection({ nodeIds: [id], edgeIds: [] })}
            onClose={() => {
              if (shellLayout === SHELL_LAYOUT.SPLIT) setInspectorOpen(false);
              else setNarrowPanel("none");
            }}
            onApplyCollision={() => {
              if (!collision) return;
              pushPositions(collision.positions);
              setCollision(null);
            }}
            onCancelCollision={() => setCollision(null)}
          />
        )}
      </div>
      {presenting ? null : (
        <CommandMenu
          open={commandsOpen}
          nodes={flow.nodes}
          onClose={() => setCommandsOpen(false)}
          onRun={runCommand}
          onFocusNode={(id) => {
            setSelection({ nodeIds: [id], edgeIds: [] });
            void fitView({
              ...readableFitOptions(),
              nodes: getNodes().filter((node) => node.id === id),
            });
          }}
        />
      )}
      <HelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
    </EditorErrorBoundary>
  );
}

export function App() {
  return (
    <ReactFlowProvider>
      <Editor />
    </ReactFlowProvider>
  );
}
