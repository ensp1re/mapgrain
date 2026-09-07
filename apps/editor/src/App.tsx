import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import { THEME, validateDocument, type Theme } from "@mapgrain/document";
import { EXPORT_FORMAT, exportVector } from "@mapgrain/renderer/vector";
import { buildScene } from "@mapgrain/scene";
import nestedGroups from "../../../tests/fixtures/documents/nested-groups.json";
import { ChatDrawer } from "./chrome/ChatDrawer.tsx";
import { CommandMenu } from "./chrome/CommandMenu.tsx";
import { Inspector } from "./chrome/Inspector.tsx";
import { Outline } from "./chrome/Outline.tsx";
import { TopBar } from "./chrome/TopBar.tsx";
import { COMMAND_ID, type CommandId } from "./constants/commands.ts";
import { ComponentNode } from "./diagram/ComponentNode.tsx";
import { GroupNode } from "./diagram/GroupNode.tsx";
import { RelationEdge } from "./diagram/RelationEdge.tsx";
import { sceneToFlow, type FlowNodeDraft } from "./diagram/sceneToFlow.ts";
import { createHistory, pushHistory, redoHistory, undoHistory } from "./history/stack.ts";
import { shouldOpenCommandMenu } from "./keyboard/commandShortcut.ts";

const nodeTypes = { component: ComponentNode, group: GroupNode };
const edgeTypes = { relation: RelationEdge };

function toFlow(nodes: FlowNodeDraft[]): Node[] {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    parentId: node.parentId,
    extent: node.parentId ? ("parent" as const) : undefined,
    style: { width: node.width, height: node.height },
    data: node.data,
  }));
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

function Specimen() {
  const { fitView } = useReactFlow();
  const [theme, setTheme] = useState<Theme>(THEME.DARK);
  const [selectedId, setSelectedId] = useState<string | null>("gateway");
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const diagram = useMemo(() => {
    const result = validateDocument(nestedGroups);
    return result.ok ? result.document : null;
  }, []);

  const [titleHistory, setTitleHistory] = useState(() => createHistory(diagram?.title ?? "Untitled"));

  const scene = useMemo(() => (diagram ? buildScene(diagram) : null), [diagram]);
  const flow = useMemo(() => {
    if (!scene?.ok) return { nodes: [] as FlowNodeDraft[], edges: [] };
    return sceneToFlow(scene.scene);
  }, [scene]);

  const rfNodes = useMemo(
    () => toFlow(flow.nodes).map((node) => ({ ...node, selected: node.id === selectedId })),
    [flow.nodes, selectedId],
  );
  const rfEdges = useMemo<Edge[]>(
    () =>
      flow.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        type: "relation",
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
      })),
    [flow.edges],
  );

  const selected = flow.nodes.find((node) => node.id === selectedId) ?? null;

  useEffect(() => {
    globalThis.document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (shouldOpenCommandMenu(event)) {
        event.preventDefault();
        setCommandsOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const exportFormat = useCallback(
    (format: typeof EXPORT_FORMAT.SVG | typeof EXPORT_FORMAT.JSON) => {
      if (!diagram) return;
      const result = exportVector({ document: diagram, format, theme });
      if (!result.ok) return;
      download(
        format === EXPORT_FORMAT.JSON ? "diagram.json" : "diagram.svg",
        result.bytes,
        result.mediaType,
      );
    },
    [diagram, theme],
  );

  const runCommand = useCallback(
    (id: CommandId) => {
      if (id === COMMAND_ID.TOGGLE_THEME) {
        setTheme((current) => (current === THEME.DARK ? THEME.LIGHT : THEME.DARK));
      }
      if (id === COMMAND_ID.TOGGLE_OUTLINE) setOutlineOpen((value) => !value);
      if (id === COMMAND_ID.TOGGLE_CHAT) setChatOpen((value) => !value);
      if (id === COMMAND_ID.UNDO) setTitleHistory((stack) => undoHistory(stack));
      if (id === COMMAND_ID.REDO) setTitleHistory((stack) => redoHistory(stack));
      if (id === COMMAND_ID.PRESENT) setPresenting((value) => !value);
      if (id === COMMAND_ID.FIT) void fitView({ padding: 0.2 });
      if (id === COMMAND_ID.EXPORT_SVG) exportFormat(EXPORT_FORMAT.SVG);
      if (id === COMMAND_ID.EXPORT_JSON) exportFormat(EXPORT_FORMAT.JSON);
    },
    [exportFormat, fitView],
  );

  if (!diagram || !scene?.ok) {
    return <p>Could not build the specimen diagram.</p>;
  }

  const workspaceClass = [
    "workspace",
    outlineOpen && !presenting ? "" : "is-outline-collapsed",
    selected && !presenting ? "" : "is-inspector-hidden",
    presenting ? "is-presenting" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={presenting ? "app is-presenting" : "app"}>
      <TopBar
        title={titleHistory.present}
        saveState={titleHistory.past.length === 0 ? "Saved" : "Edited"}
        canUndo={titleHistory.past.length > 0}
        canRedo={titleHistory.future.length > 0}
        presenting={presenting}
        chatOpen={chatOpen}
        onTitleChange={(value) => setTitleHistory((stack) => pushHistory(stack, value))}
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
          <Outline nodes={flow.nodes} selectedId={selectedId} onSelect={setSelectedId} />
        )}
        <div className="canvas">
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeClick={(_event, node) => setSelectedId(node.id)}
            onPaneClick={() => setSelectedId(null)}
            onNodeMouseEnter={(event, node) => {
              const box = (event.currentTarget as HTMLElement).closest(".canvas")?.getBoundingClientRect();
              setTooltip({
                x: event.clientX - (box?.left ?? 0) + 12,
                y: event.clientY - (box?.top ?? 0) + 12,
                text: String(node.data.label ?? node.id),
              });
            }}
            onNodeMouseLeave={() => setTooltip(null)}
            fitView
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
          {presenting ? null : <ChatDrawer open={chatOpen} />}
        </div>
        {presenting ? null : <Inspector document={diagram} node={selected} />}
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
