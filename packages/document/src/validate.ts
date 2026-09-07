import { Value } from "@sinclair/typebox/value";
import { SCHEMA_VERSION } from "./constants/document.ts";
import { VALIDATION_ERROR_CODE } from "./constants/errors.ts";
import { DiagramDocumentSchema } from "./schema/document.ts";
import type { DiagramDocument } from "./types/document.ts";
import type { ValidationIssue, ValidationResult } from "./types/validation.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function issue(
  code: ValidationIssue["code"],
  message: string,
  path: string,
  elementId: string | null = null,
): ValidationIssue {
  return { code, message, path, elementId };
}

function uniquePush(seen: Map<string, string>, id: string, path: string, errors: ValidationIssue[]) {
  const existing = seen.get(id);
  if (existing) {
    errors.push(
      issue(
        VALIDATION_ERROR_CODE.DUPLICATE_ID,
        `id "${id}" is already used at ${existing}`,
        path,
        id,
      ),
    );
    return;
  }
  seen.set(id, path);
}

function collectSchemaErrors(input: unknown): ValidationIssue[] {
  const errors: ValidationIssue[] = [];
  for (const error of Value.Errors(DiagramDocumentSchema, input)) {
    errors.push(
      issue(
        VALIDATION_ERROR_CODE.INVALID_DOCUMENT,
        error.message,
        error.path || "/",
      ),
    );
  }
  return errors;
}

function groupCycle(groups: DiagramDocument["groups"]): string[] | null {
  const byId = new Map(groups.map((group) => [group.id, group]));
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function walk(id: string, stack: string[]): string[] | null {
    if (visiting.has(id)) return [...stack.slice(stack.indexOf(id)), id];
    if (visited.has(id)) return null;
    visiting.add(id);
    const parentId = byId.get(id)?.parentId;
    const cycle = parentId ? walk(parentId, [...stack, id]) : null;
    visiting.delete(id);
    visited.add(id);
    return cycle;
  }

  for (const group of groups) {
    const cycle = walk(group.id, []);
    if (cycle) return cycle;
  }
  return null;
}

function semanticErrors(document: DiagramDocument): ValidationIssue[] {
  const errors: ValidationIssue[] = [];
  const seen = new Map<string, string>();
  const nodeIds = new Set<string>();
  const groupIds = new Set<string>();
  const edgeIds = new Set<string>();
  const portsByNode = new Map<string, Set<string>>();

  document.groups.forEach((group, index) => {
    uniquePush(seen, group.id, `/groups/${index}/id`, errors);
    groupIds.add(group.id);
  });
  document.nodes.forEach((node, index) => {
    uniquePush(seen, node.id, `/nodes/${index}/id`, errors);
    nodeIds.add(node.id);
    const ports = new Set<string>();
    node.ports.forEach((port, portIndex) => {
      if (ports.has(port.id)) {
        errors.push(
          issue(
            VALIDATION_ERROR_CODE.DUPLICATE_ID,
            `port id "${port.id}" is duplicated on node "${node.id}"`,
            `/nodes/${index}/ports/${portIndex}/id`,
            port.id,
          ),
        );
      }
      ports.add(port.id);
    });
    portsByNode.set(node.id, ports);
  });
  document.edges.forEach((edge, index) => {
    uniquePush(seen, edge.id, `/edges/${index}/id`, errors);
    edgeIds.add(edge.id);
  });
  document.views.forEach((view, index) => uniquePush(seen, view.id, `/views/${index}/id`, errors));
  for (const [index, item] of (document.evidence ?? []).entries()) {
    uniquePush(seen, item.id, `/evidence/${index}/id`, errors);
  }

  document.nodes.forEach((node, index) => {
    if (node.groupId && !groupIds.has(node.groupId)) {
      errors.push(
        issue(
          VALIDATION_ERROR_CODE.DANGLING_REFERENCE,
          `node "${node.id}" references missing group "${node.groupId}"`,
          `/nodes/${index}/groupId`,
          node.id,
        ),
      );
    }
  });

  document.groups.forEach((group, index) => {
    if (group.parentId && !groupIds.has(group.parentId)) {
      errors.push(
        issue(
          VALIDATION_ERROR_CODE.DANGLING_REFERENCE,
          `group "${group.id}" references missing parent "${group.parentId}"`,
          `/groups/${index}/parentId`,
          group.id,
        ),
      );
    }
  });

  const cycle = groupCycle(document.groups);
  if (cycle) {
    errors.push(
      issue(
        VALIDATION_ERROR_CODE.GROUP_CYCLE,
        `group parent cycle: ${cycle.join(" -> ")}`,
        "/groups",
        cycle[0] ?? null,
      ),
    );
  }

  function checkEndpoint(
    edgeId: string,
    path: string,
    endpoint: DiagramDocument["edges"][number]["source"],
  ) {
    if (!nodeIds.has(endpoint.nodeId)) {
      errors.push(
        issue(
          VALIDATION_ERROR_CODE.DANGLING_REFERENCE,
          `edge "${edgeId}" references missing node "${endpoint.nodeId}"`,
          path,
          edgeId,
        ),
      );
      return;
    }
    if (endpoint.portId && !portsByNode.get(endpoint.nodeId)?.has(endpoint.portId)) {
      errors.push(
        issue(
          VALIDATION_ERROR_CODE.DANGLING_REFERENCE,
          `edge "${edgeId}" references missing port "${endpoint.portId}" on "${endpoint.nodeId}"`,
          `${path}/portId`,
          edgeId,
        ),
      );
    }
  }

  document.edges.forEach((edge, index) => {
    checkEndpoint(edge.id, `/edges/${index}/source`, edge.source);
    checkEndpoint(edge.id, `/edges/${index}/target`, edge.target);
  });

  document.layoutHints.pinnedNodeIds.forEach((id, index) => {
    if (!nodeIds.has(id)) {
      errors.push(
        issue(
          VALIDATION_ERROR_CODE.DANGLING_REFERENCE,
          `pinned node "${id}" does not exist`,
          `/layoutHints/pinnedNodeIds/${index}`,
          id,
        ),
      );
    }
  });

  document.views.forEach((view, index) => {
    for (const [nodeIndex, id] of (view.nodeIds ?? []).entries()) {
      if (!nodeIds.has(id)) {
        errors.push(
          issue(
            VALIDATION_ERROR_CODE.DANGLING_REFERENCE,
            `view "${view.id}" references missing node "${id}"`,
            `/views/${index}/nodeIds/${nodeIndex}`,
            view.id,
          ),
        );
      }
    }
    for (const [edgeIndex, id] of (view.edgeIds ?? []).entries()) {
      if (!edgeIds.has(id)) {
        errors.push(
          issue(
            VALIDATION_ERROR_CODE.DANGLING_REFERENCE,
            `view "${view.id}" references missing edge "${id}"`,
            `/views/${index}/edgeIds/${edgeIndex}`,
            view.id,
          ),
        );
      }
    }
    if (view.path) {
      if (!nodeIds.has(view.path.from)) {
        errors.push(
          issue(
            VALIDATION_ERROR_CODE.DANGLING_REFERENCE,
            `view "${view.id}" path.from "${view.path.from}" does not exist`,
            `/views/${index}/path/from`,
            view.id,
          ),
        );
      }
      if (!nodeIds.has(view.path.to)) {
        errors.push(
          issue(
            VALIDATION_ERROR_CODE.DANGLING_REFERENCE,
            `view "${view.id}" path.to "${view.path.to}" does not exist`,
            `/views/${index}/path/to`,
            view.id,
          ),
        );
      }
    }
  });

  for (const [index, item] of (document.evidence ?? []).entries()) {
    const exists =
      (item.targetKind === "node" && nodeIds.has(item.targetId)) ||
      (item.targetKind === "edge" && edgeIds.has(item.targetId)) ||
      (item.targetKind === "group" && groupIds.has(item.targetId));
    if (!exists) {
      errors.push(
        issue(
          VALIDATION_ERROR_CODE.DANGLING_REFERENCE,
          `evidence "${item.id}" references missing ${item.targetKind} "${item.targetId}"`,
          `/evidence/${index}/targetId`,
          item.id,
        ),
      );
    }
  }

  return errors;
}

export function validateDocument(input: unknown): ValidationResult {
  if (isRecord(input) && "schemaVersion" in input && input.schemaVersion !== SCHEMA_VERSION) {
    return {
      ok: false,
      errors: [
        issue(
          VALIDATION_ERROR_CODE.UNSUPPORTED_SCHEMA_VERSION,
          `unsupported schemaVersion ${String(input.schemaVersion)}; expected ${SCHEMA_VERSION}`,
          "/schemaVersion",
        ),
      ],
    };
  }

  if (!Value.Check(DiagramDocumentSchema, input)) {
    return { ok: false, errors: collectSchemaErrors(input) };
  }

  const semantics = semanticErrors(input);
  if (semantics.length > 0) return { ok: false, errors: semantics };
  return { ok: true, document: input };
}
