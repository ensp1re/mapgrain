import { mappedNodeKind } from "./constants/convert.ts";
import { DOCUMENT_KIND, NODE_KIND, NODE_MARKER } from "./constants/document.ts";
import { defaultEdgeType, EDGES_FOR_KIND } from "./constants/modes.ts";
import type { ConversionChange, ConversionPreview } from "./types/convert.ts";
import type { DiagramDocument, DiagramEdge, DiagramNode, DocumentKind } from "./types/document.ts";

function cloneDocument(document: DiagramDocument): DiagramDocument {
  return structuredClone(document);
}

function change(
  id: string,
  label: string,
  from: ConversionChange["from"],
  to: ConversionChange["to"],
): ConversionChange {
  const action = to === null ? "drop" : to === from ? "keep" : "remap";
  return { id, label, action, from, to };
}

function labelledOutcome(edge: DiagramEdge): boolean {
  return Boolean(edge.outcome ?? edge.label);
}

export function convertDocument(document: DiagramDocument, target: DocumentKind): ConversionPreview {
  const next = cloneDocument(document);
  next.kind = target;
  const nodeChanges: ConversionChange[] = [];
  const keptNodes: DiagramNode[] = [];
  const keptIds = new Set<string>();

  for (const node of next.nodes) {
    const mapped = mappedNodeKind(node.kind, target);
    nodeChanges.push(change(node.id, node.label, node.kind, mapped));
    if (!mapped) continue;
    const converted = { ...node, kind: mapped };
    if (target !== DOCUMENT_KIND.LIFECYCLE) delete converted.marker;
    keptNodes.push(converted);
    keptIds.add(node.id);
  }

  const first = keptNodes[0];
  if (
    target === DOCUMENT_KIND.LIFECYCLE &&
    first &&
    !keptNodes.some((node) => node.marker === NODE_MARKER.INITIAL)
  ) {
    keptNodes[0] = { ...first, marker: NODE_MARKER.INITIAL };
  }

  const allowedEdges = new Set(EDGES_FOR_KIND[target]);
  const fallbackType = defaultEdgeType(target);
  const edgeChanges: ConversionChange[] = [];
  const keptEdges: DiagramEdge[] = [];

  for (const edge of next.edges) {
    if (!keptIds.has(edge.source.nodeId) || !keptIds.has(edge.target.nodeId)) {
      edgeChanges.push(change(edge.id, edge.label ?? edge.type, edge.type, null));
      continue;
    }
    const mapped = allowedEdges.has(edge.type) ? edge.type : fallbackType;
    edgeChanges.push(change(edge.id, edge.label ?? edge.type, edge.type, mapped));
    const converted: DiagramEdge = { ...edge, type: mapped };
    if (target === DOCUMENT_KIND.SEQUENCE) {
      converted.order = keptEdges.length + 1;
    } else {
      delete converted.order;
    }
    keptEdges.push(converted);
  }

  if (target === DOCUMENT_KIND.WORKFLOW) {
    for (const [index, node] of keptNodes.entries()) {
      if (node.kind !== NODE_KIND.DECISION) continue;
      const outgoing = keptEdges.filter((edge) => edge.source.nodeId === node.id);
      if (outgoing.length >= 2 && outgoing.every(labelledOutcome)) continue;
      keptNodes[index] = { ...node, kind: NODE_KIND.JOB };
      const record = nodeChanges.find((item) => item.id === node.id);
      if (record && record.to === NODE_KIND.DECISION) {
        record.to = NODE_KIND.JOB;
        record.action = "remap";
      }
    }
  }

  const fragmentsDropped = target === DOCUMENT_KIND.SEQUENCE ? 0 : (next.fragments ?? []).length;
  next.nodes = keptNodes;
  next.edges = keptEdges;
  if (target === DOCUMENT_KIND.SEQUENCE) {
    next.fragments = next.fragments ?? [];
  } else {
    delete next.fragments;
  }
  next.layoutHints = {
    ...next.layoutHints,
    pinnedNodeIds: next.layoutHints.pinnedNodeIds.filter((id) => keptIds.has(id)),
  };
  if (next.layout?.positions) {
    const positions = { ...next.layout.positions };
    for (const id of Object.keys(positions)) {
      if (!keptIds.has(id)) delete positions[id];
    }
    next.layout = { ...next.layout, positions };
  }
  next.views = next.views.map((view) => ({
    ...view,
    nodeIds: view.nodeIds?.filter((id) => keptIds.has(id)),
    edgeIds: view.edgeIds?.filter((id) => keptEdges.some((edge) => edge.id === id)),
    path:
      view.path && keptIds.has(view.path.from) && keptIds.has(view.path.to) ? view.path : undefined,
  }));
  if (next.stories) {
    next.stories = next.stories.map((story) => ({
      ...story,
      steps: story.steps.filter((step) => !step.nodeId || keptIds.has(step.nodeId)),
    }));
  }

  return {
    from: document.kind,
    to: target,
    nodes: nodeChanges,
    edges: edgeChanges,
    fragmentsDropped,
    document: next,
  };
}

function countAction(items: ConversionChange[], action: ConversionChange["action"]): number {
  return items.filter((item) => item.action === action).length;
}

export function conversionSummary(preview: ConversionPreview): string {
  const kept = countAction(preview.nodes, "keep") + countAction(preview.edges, "keep");
  const remapped = countAction(preview.nodes, "remap") + countAction(preview.edges, "remap");
  const dropped = countAction(preview.nodes, "drop") + countAction(preview.edges, "drop") + preview.fragmentsDropped;
  const parts = [`Keep ${kept}`, `remap ${remapped}`, `drop ${dropped}`];
  return parts.join(", ") + ".";
}
