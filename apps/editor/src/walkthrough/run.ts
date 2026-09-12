import {
  DOCUMENT_KIND,
  NODE_KIND,
  NODE_MARKER,
  type DiagramDocument,
  type DiagramEdge,
} from "@mapgrain/document";
import type { RunState, RunTransition } from "../types/run.ts";

/** Only kinds where "what happens next" is a real question the document can answer. */
export function canRun(document: DiagramDocument): boolean {
  if (document.kind === DOCUMENT_KIND.LIFECYCLE) return document.nodes.length > 0;
  if (document.kind === DOCUMENT_KIND.WORKFLOW) return document.nodes.length > 0;
  return false;
}

function transitionLabel(edge: DiagramEdge): string {
  return edge.outcome ?? edge.guard ?? edge.label ?? "continue";
}

/** Where a run starts: the initial state, else a node nothing points at, else the first node. */
export function runEntry(document: DiagramDocument): string | null {
  const initial = document.nodes.find((node) => node.marker === NODE_MARKER.INITIAL);
  if (initial) return initial.id;
  const targets = new Set(document.edges.map((edge) => edge.target.nodeId));
  const root = document.nodes.find((node) => !targets.has(node.id));
  return root?.id ?? document.nodes[0]?.id ?? null;
}

/** The moves available from where the run currently stands. */
export function availableTransitions(document: DiagramDocument, activeId: string): RunTransition[] {
  return document.edges
    .filter((edge) => edge.source.nodeId === activeId)
    .map((edge) => ({
      edgeId: edge.id,
      targetId: edge.target.nodeId,
      label: transitionLabel(edge),
    }));
}

/** True once the run reaches a state marked final, or one with nowhere left to go. */
export function isRunFinished(document: DiagramDocument, activeId: string): boolean {
  const node = document.nodes.find((item) => item.id === activeId);
  if (node?.marker === NODE_MARKER.FINAL) return true;
  return availableTransitions(document, activeId).length === 0;
}

/**
 * Fires one transition. Reading a diagram never writes to it, so this returns the next run
 * state rather than an operation.
 */
export function fireTransition(
  document: DiagramDocument,
  state: RunState,
  edgeId: string,
): RunState {
  const move = availableTransitions(document, state.activeId).find((item) => item.edgeId === edgeId);
  if (!move) return state;
  return {
    activeId: move.targetId,
    log: [
      ...state.log,
      { edgeId, fromId: state.activeId, toId: move.targetId, label: move.label },
    ],
  };
}

export function startRun(document: DiagramDocument): RunState | null {
  const entry = runEntry(document);
  return entry ? { activeId: entry, log: [] } : null;
}

/** A decision in a workflow is the one node kind whose branches are the point. */
export function isBranch(document: DiagramDocument, nodeId: string): boolean {
  const node = document.nodes.find((item) => item.id === nodeId);
  return node?.kind === NODE_KIND.DECISION;
}
