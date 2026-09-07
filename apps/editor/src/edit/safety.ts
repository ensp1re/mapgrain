import type { DiagramDocument } from "@mapgrain/document";
import { COMMAND_ID, type CommandId } from "../constants/commands.ts";
import type { EditorSelection } from "../types/editor.ts";

export interface LayoutToken {
  documentId: string;
  documentRevision: number;
  layoutRevision: number;
}

export function layoutToken(document: DiagramDocument): LayoutToken {
  return {
    documentId: document.id,
    documentRevision: document.revision,
    layoutRevision: document.layout?.revision ?? 0,
  };
}

export function layoutTokenMatches(document: DiagramDocument, token: LayoutToken): boolean {
  return (
    document.id === token.documentId &&
    document.revision === token.documentRevision &&
    (document.layout?.revision ?? 0) === token.layoutRevision
  );
}

const MUTATING_COMMANDS = new Set<CommandId>([
  COMMAND_ID.UNDO,
  COMMAND_ID.REDO,
  COMMAND_ID.DELETE,
  COMMAND_ID.DUPLICATE,
  COMMAND_ID.ALIGN_LEFT,
  COMMAND_ID.ALIGN_RIGHT,
  COMMAND_ID.ALIGN_TOP,
  COMMAND_ID.ALIGN_BOTTOM,
  COMMAND_ID.ARRANGE,
  COMMAND_ID.NEW,
  COMMAND_ID.IMPORT,
  COMMAND_ID.CONNECT,
  COMMAND_ID.TOGGLE_THEME,
]);

export function commandAllowed(presenting: boolean, id: CommandId): boolean {
  if (!presenting) return true;
  return !MUTATING_COMMANDS.has(id);
}

export function selectionFromFlow(
  nodes: Array<{ id: string }>,
  edges: Array<{ id: string }>,
): EditorSelection {
  return {
    nodeIds: nodes.map((node) => node.id),
    edgeIds: edges.map((edge) => edge.id),
  };
}
