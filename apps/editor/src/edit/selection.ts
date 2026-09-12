import type { EditorSelection } from "../types/editor.ts";

export function sameIdSet(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const other = new Set(right);
  for (const id of left) {
    if (!other.has(id)) return false;
  }
  return true;
}

export function sameSelection(left: EditorSelection, right: EditorSelection): boolean {
  return sameIdSet(left.nodeIds, right.nodeIds) && sameIdSet(left.edgeIds, right.edgeIds);
}

export function retainSelection(current: EditorSelection, next: EditorSelection): EditorSelection {
  return sameSelection(current, next) ? current : next;
}

export function retainFlowSelection(current: EditorSelection, next: EditorSelection): EditorSelection {
  if (next.nodeIds.length === 0 && next.edgeIds.length === 0) return current;
  // A connection is selected through onEdgesChange or the outline, neither of which React
  // Flow's own selection listener sees until the next render. Its node-only echo must not
  // resurrect the card that was selected before.
  if (current.edgeIds.length > 0 && next.edgeIds.length === 0) return current;
  return retainSelection(current, next);
}
