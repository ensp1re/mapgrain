import type { DiagramDocument } from "@mapgrain/document";

export function sanitizeDocument(
  document: DiagramDocument,
  includeEvidence: boolean,
): DiagramDocument {
  if (includeEvidence) return document;
  const rest = { ...document };
  delete rest.evidence;
  return rest;
}

export function subsetDocument(document: DiagramDocument, nodeIds: string[]): DiagramDocument {
  const allowed = new Set(nodeIds);
  const nodes = document.nodes.filter((node) => allowed.has(node.id));
  const nodeSet = new Set(nodes.map((node) => node.id));
  const edges = document.edges.filter(
    (edge) => nodeSet.has(edge.source.nodeId) && nodeSet.has(edge.target.nodeId),
  );
  const groupIds = new Set(nodes.map((node) => node.groupId).filter((id): id is string => Boolean(id)));
  const groupsById = new Map(document.groups.map((group) => [group.id, group]));
  const include = new Set(groupIds);
  for (const id of groupIds) {
    let current = groupsById.get(id);
    while (current?.parentId) {
      include.add(current.parentId);
      current = groupsById.get(current.parentId);
    }
  }
  const groups = document.groups.filter((group) => include.has(group.id));
  const views = document.views.filter((view) => {
    if (view.path) return nodeSet.has(view.path.from) && nodeSet.has(view.path.to);
    if (view.nodeIds) return view.nodeIds.every((id) => nodeSet.has(id));
    return true;
  });
  const evidence = document.evidence?.filter((item) => {
    if (item.targetKind === "node") return nodeSet.has(item.targetId);
    if (item.targetKind === "edge") return edges.some((edge) => edge.id === item.targetId);
    return include.has(item.targetId);
  });
  return {
    ...document,
    nodes,
    edges,
    groups,
    views,
    ...(evidence ? { evidence } : {}),
    layoutHints: {
      ...document.layoutHints,
      pinnedNodeIds: document.layoutHints.pinnedNodeIds.filter((id) => nodeSet.has(id)),
    },
  };
}
