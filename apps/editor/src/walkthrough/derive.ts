import { DOCUMENT_KIND, NODE_MARKER, type DiagramDocument, type DiagramEdge } from "@mapgrain/document";
import type { WalkStep } from "../types/walkthrough.ts";

function labelOf(document: DiagramDocument, nodeId: string): string {
  return document.nodes.find((node) => node.id === nodeId)?.label ?? nodeId;
}

function edgeText(edge: DiagramEdge): string | undefined {
  return edge.outcome ?? edge.guard ?? edge.label;
}

/** Messages carry their own order, so the story is already written. */
function sequenceSteps(document: DiagramDocument): WalkStep[] {
  return [...document.edges]
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
    .map((edge) => ({
      nodeId: edge.target.nodeId,
      edgeId: edge.id,
      name: `${labelOf(document, edge.source.nodeId)} → ${labelOf(document, edge.target.nodeId)}`,
      description: edgeText(edge),
    }));
}

/** Nodes nothing points at, falling back to the first node so a cycle still starts. */
function entryIds(document: DiagramDocument): string[] {
  const targets = new Set(document.edges.map((edge) => edge.target.nodeId));
  const roots = document.nodes.filter((node) => !targets.has(node.id)).map((node) => node.id);
  if (roots.length > 0) return roots;
  const first = document.nodes[0];
  return first ? [first.id] : [];
}

function lifecycleEntries(document: DiagramDocument): string[] {
  const initial = document.nodes
    .filter((node) => node.marker === NODE_MARKER.INITIAL)
    .map((node) => node.id);
  return initial.length > 0 ? initial : entryIds(document);
}

/** Breadth-first from the entry nodes, so each step follows an edge the reader can see. */
function walkSteps(document: DiagramDocument, entries: string[]): WalkStep[] {
  const outgoing = new Map<string, DiagramEdge[]>();
  for (const edge of document.edges) {
    outgoing.set(edge.source.nodeId, [...(outgoing.get(edge.source.nodeId) ?? []), edge]);
  }
  const seen = new Set<string>();
  const steps: WalkStep[] = [];
  const queue: WalkStep[] = entries.map((nodeId) => ({
    nodeId,
    edgeId: null,
    name: labelOf(document, nodeId),
  }));
  while (queue.length > 0) {
    const step = queue.shift();
    if (!step || seen.has(step.nodeId)) continue;
    seen.add(step.nodeId);
    steps.push(step);
    for (const edge of outgoing.get(step.nodeId) ?? []) {
      if (seen.has(edge.target.nodeId)) continue;
      queue.push({
        nodeId: edge.target.nodeId,
        edgeId: edge.id,
        name: labelOf(document, edge.target.nodeId),
        description: edgeText(edge),
      });
    }
  }
  // A disconnected node is still part of the diagram.
  for (const node of document.nodes) {
    if (seen.has(node.id)) continue;
    steps.push({ nodeId: node.id, edgeId: null, name: node.label });
  }
  return steps;
}

/**
 * An ordered reading of a diagram, derived from its own shape so no authoring is needed.
 * An authored story wins when the document carries one.
 */
export function deriveWalkthrough(document: DiagramDocument): WalkStep[] {
  const authored = document.stories?.[0];
  if (authored) {
    return authored.steps
      .filter((step) => step.nodeId !== undefined)
      .map((step) => ({
        nodeId: step.nodeId as string,
        edgeId: null,
        name: step.name,
        description: step.description,
      }));
  }
  if (document.nodes.length === 0) return [];
  if (document.kind === DOCUMENT_KIND.SEQUENCE) return sequenceSteps(document);
  if (document.kind === DOCUMENT_KIND.LIFECYCLE) return walkSteps(document, lifecycleEntries(document));
  return walkSteps(document, entryIds(document));
}
