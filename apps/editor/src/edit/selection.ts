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
