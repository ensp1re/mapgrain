import { VALIDATION_ERROR_CODE } from "../constants/errors.ts";
import { OPERATION_KIND } from "../constants/operations.ts";
import type { DiagramDocument, DiagramEdge, DiagramNode } from "../types/document.ts";
import type { ApplyResult, Operation } from "../types/operation.ts";
import type { ValidationIssue } from "../types/validation.ts";
import { applyPortableLayout } from "../layout/portable.ts";
import { validateDocument } from "../validate.ts";

function cloneDocument(document: DiagramDocument): DiagramDocument {
  return structuredClone(document);
}

function fail(
  document: DiagramDocument,
  message: string,
  path: string,
  elementId: string | null = null,
): ApplyResult {
  const errors: ValidationIssue[] = [
    { code: VALIDATION_ERROR_CODE.INVALID_DOCUMENT, message, path, elementId },
  ];
  return { ok: false, document, errors };
}

function commit(next: DiagramDocument, inverse: Operation, fallback: DiagramDocument): ApplyResult {
  next.revision += 1;
  const validated = validateDocument(next);
  if (!validated.ok) return { ok: false, document: fallback, errors: validated.errors };
  return { ok: true, document: validated.document, inverse };
}

function findNode(document: DiagramDocument, nodeId: string): DiagramNode | undefined {
  return document.nodes.find((node) => node.id === nodeId);
}

function findEdge(document: DiagramDocument, edgeId: string): DiagramEdge | undefined {
  return document.edges.find((edge) => edge.id === edgeId);
}

function removeNodeRefs(document: DiagramDocument, nodeId: string): void {
  document.edges = document.edges.filter(
    (edge) => edge.source.nodeId !== nodeId && edge.target.nodeId !== nodeId,
  );
  document.layoutHints.pinnedNodeIds = document.layoutHints.pinnedNodeIds.filter((id) => id !== nodeId);
  if (document.layout?.positions) {
    const rest = { ...document.layout.positions };
    delete rest[nodeId];
    document.layout = { ...document.layout, positions: rest };
  }
  document.views = document.views.map((view) => ({
    ...view,
    nodeIds: view.nodeIds?.filter((id) => id !== nodeId),
    path:
      view.path && (view.path.from === nodeId || view.path.to === nodeId) ? undefined : view.path,
  }));
}

function endpoint(nodeId: string, portId?: string): { nodeId: string; portId?: string } {
  return portId ? { nodeId, portId } : { nodeId };
}

export function applyOperation(document: DiagramDocument, operation: Operation): ApplyResult {
  const next = cloneDocument(document);

  switch (operation.kind) {
    case OPERATION_KIND.SET_TITLE: {
      next.title = operation.title;
      return commit(next, { kind: OPERATION_KIND.SET_TITLE, title: document.title }, document);
    }
    case OPERATION_KIND.SET_NODE_LABEL: {
      const node = findNode(next, operation.nodeId);
      if (!node) return fail(document, `unknown node ${operation.nodeId}`, "/nodes", operation.nodeId);
      const inverse: Operation = {
        kind: OPERATION_KIND.SET_NODE_LABEL,
        nodeId: node.id,
        label: node.label,
      };
      node.label = operation.label;
      return commit(next, inverse, document);
    }
    case OPERATION_KIND.SET_GROUP_LABEL: {
      const group = next.groups.find((item) => item.id === operation.groupId);
      if (!group) return fail(document, `unknown group ${operation.groupId}`, "/groups", operation.groupId);
      const inverse: Operation = {
        kind: OPERATION_KIND.SET_GROUP_LABEL,
        groupId: group.id,
        label: group.label,
      };
      group.label = operation.label;
      return commit(next, inverse, document);
    }
    case OPERATION_KIND.SET_EDGE_LABEL: {
      const edge = findEdge(next, operation.edgeId);
      if (!edge) return fail(document, `unknown edge ${operation.edgeId}`, "/edges", operation.edgeId);
      const inverse: Operation = {
        kind: OPERATION_KIND.SET_EDGE_LABEL,
        edgeId: edge.id,
        label: edge.label ?? "",
      };
      if (operation.label) edge.label = operation.label;
      else delete edge.label;
      return commit(next, inverse, document);
    }
    case OPERATION_KIND.SET_EDGE_TYPE: {
      const edge = findEdge(next, operation.edgeId);
      if (!edge) return fail(document, `unknown edge ${operation.edgeId}`, "/edges", operation.edgeId);
      const inverse: Operation = {
        kind: OPERATION_KIND.SET_EDGE_TYPE,
        edgeId: edge.id,
        type: edge.type,
      };
      edge.type = operation.type;
      return commit(next, inverse, document);
    }
    case OPERATION_KIND.SET_EDGE_DIRECTION: {
      const edge = findEdge(next, operation.edgeId);
      if (!edge) return fail(document, `unknown edge ${operation.edgeId}`, "/edges", operation.edgeId);
      const inverse: Operation = {
        kind: OPERATION_KIND.SET_EDGE_DIRECTION,
        edgeId: edge.id,
        direction: edge.direction,
      };
      edge.direction = operation.direction;
      return commit(next, inverse, document);
    }
    case OPERATION_KIND.ADD_EDGE: {
      next.edges.push({
        id: operation.id,
        source: endpoint(operation.source.nodeId, operation.source.portId),
        target: endpoint(operation.target.nodeId, operation.target.portId),
        type: operation.type,
        direction: operation.direction,
        ...(operation.label ? { label: operation.label } : {}),
      });
      return commit(next, { kind: OPERATION_KIND.DELETE_EDGE, edgeId: operation.id }, document);
    }
    case OPERATION_KIND.DELETE_EDGE: {
      const edge = findEdge(document, operation.edgeId);
      if (!edge) return fail(document, `unknown edge ${operation.edgeId}`, "/edges", operation.edgeId);
      next.edges = next.edges.filter((item) => item.id !== operation.edgeId);
      return commit(
        next,
        {
          kind: OPERATION_KIND.ADD_EDGE,
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: edge.type,
          direction: edge.direction,
          label: edge.label,
        },
        document,
      );
    }
    case OPERATION_KIND.ADD_NODE: {
      if (findNode(next, operation.node.id)) {
        return fail(document, `id ${operation.node.id} already exists`, "/nodes", operation.node.id);
      }
      next.nodes.push(structuredClone(operation.node));
      for (const edge of operation.edges ?? []) {
        if (!findEdge(next, edge.id)) next.edges.push(structuredClone(edge));
      }
      if (operation.pinned && !next.layoutHints.pinnedNodeIds.includes(operation.node.id)) {
        next.layoutHints.pinnedNodeIds.push(operation.node.id);
      }
      if (operation.views) next.views = structuredClone(operation.views);
      return commit(next, { kind: OPERATION_KIND.DELETE_NODE, nodeId: operation.node.id }, document);
    }
    case OPERATION_KIND.DELETE_NODE: {
      const node = findNode(document, operation.nodeId);
      if (!node) return fail(document, `unknown node ${operation.nodeId}`, "/nodes", operation.nodeId);
      const attached = document.edges.filter(
        (edge) => edge.source.nodeId === node.id || edge.target.nodeId === node.id,
      );
      const pinned = document.layoutHints.pinnedNodeIds.includes(node.id);
      next.nodes = next.nodes.filter((item) => item.id !== node.id);
      removeNodeRefs(next, node.id);
      return commit(
        next,
        {
          kind: OPERATION_KIND.ADD_NODE,
          node: structuredClone(node),
          edges: structuredClone(attached),
          pinned,
          views: structuredClone(document.views),
        },
        document,
      );
    }
    case OPERATION_KIND.DUPLICATE_NODE: {
      const node = findNode(next, operation.nodeId);
      if (!node) return fail(document, `unknown node ${operation.nodeId}`, "/nodes", operation.nodeId);
      if (findNode(next, operation.newId)) {
        return fail(document, `id ${operation.newId} already exists`, "/nodes", operation.newId);
      }
      next.nodes.push({ ...structuredClone(node), id: operation.newId });
      return commit(next, { kind: OPERATION_KIND.DELETE_NODE, nodeId: operation.newId }, document);
    }
    case OPERATION_KIND.SET_NODE_GROUP: {
      const node = findNode(next, operation.nodeId);
      if (!node) return fail(document, `unknown node ${operation.nodeId}`, "/nodes", operation.nodeId);
      const inverse: Operation = {
        kind: OPERATION_KIND.SET_NODE_GROUP,
        nodeId: node.id,
        groupId: node.groupId,
      };
      node.groupId = operation.groupId;
      return commit(next, inverse, document);
    }
    case OPERATION_KIND.SET_NODE_PINNED: {
      const node = findNode(next, operation.nodeId);
      if (!node) return fail(document, `unknown node ${operation.nodeId}`, "/nodes", operation.nodeId);
      const pinned = next.layoutHints.pinnedNodeIds.includes(node.id);
      const inverse: Operation = {
        kind: OPERATION_KIND.SET_NODE_PINNED,
        nodeId: node.id,
        pinned,
      };
      if (operation.pinned && !pinned) next.layoutHints.pinnedNodeIds.push(node.id);
      if (!operation.pinned) {
        next.layoutHints.pinnedNodeIds = next.layoutHints.pinnedNodeIds.filter((id) => id !== node.id);
      }
      return commit(next, inverse, document);
    }
    case OPERATION_KIND.ADD_GROUP: {
      if (next.groups.some((group) => group.id === operation.id)) {
        return fail(document, `id ${operation.id} already exists`, "/groups", operation.id);
      }
      next.groups.push({
        id: operation.id,
        label: operation.label,
        parentId: operation.parentId ?? null,
      });
      return commit(next, { kind: OPERATION_KIND.DELETE_GROUP, groupId: operation.id }, document);
    }
    case OPERATION_KIND.DELETE_GROUP: {
      const group = next.groups.find((item) => item.id === operation.groupId);
      if (!group) return fail(document, `unknown group ${operation.groupId}`, "/groups", operation.groupId);
      next.groups = next.groups.filter((item) => item.id !== operation.groupId);
      next.groups = next.groups.map((item) =>
        item.parentId === operation.groupId ? { ...item, parentId: group.parentId } : item,
      );
      next.nodes = next.nodes.map((node) =>
        node.groupId === operation.groupId ? { ...node, groupId: group.parentId } : node,
      );
      return commit(
        next,
        { kind: OPERATION_KIND.ADD_GROUP, id: group.id, label: group.label, parentId: group.parentId },
        document,
      );
    }
    case OPERATION_KIND.SET_THEME: {
      const inverse: Operation = { kind: OPERATION_KIND.SET_THEME, theme: document.theme };
      next.theme = operation.theme;
      return commit(next, inverse, document);
    }
    case OPERATION_KIND.SET_LAYOUT: {
      const inverse: Operation = {
        kind: OPERATION_KIND.SET_LAYOUT,
        positions: { ...(document.layout?.positions ?? {}) },
      };
      const laidOut = applyPortableLayout(next, operation.positions);
      return commit(laidOut, inverse, document);
    }
    default: {
      const _never: never = operation;
      return fail(document, `unsupported operation ${String(_never)}`, "/");
    }
  }
}

export function nextPrefixedId(prefix: string, used: Iterable<string>): string {
  const taken = new Set(used);
  let index = 1;
  while (taken.has(`${prefix}${index}`)) index += 1;
  return `${prefix}${index}`;
}
