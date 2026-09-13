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

export interface SelectChange {
  id: string;
  selected: boolean;
}

/**
 * React Flow reports selection as changes, one per item. Folding them into the editor's own
 * selection keeps this component the single authority: its selection listener reports its own
 * store, which lags a render, so letting that win meant a stale card or connection kept coming
 * back over the one the reader had just picked.
 *
 * A component and a connection are never selected together, because the inspector shows one
 * thing and the outline highlights one thing.
 */
export function applySelectChanges(
  current: EditorSelection,
  changes: readonly SelectChange[],
  kind: "node" | "edge",
): EditorSelection {
  if (changes.length === 0) return current;
  const mine = kind === "node" ? current.nodeIds : current.edgeIds;
  const next = new Set(mine);
  for (const change of changes) {
    if (change.selected) next.add(change.id);
    else next.delete(change.id);
  }
  const ids = [...next];
  if (sameIdSet(ids, mine)) return current;
  const other = kind === "node" ? current.edgeIds : current.nodeIds;
  const kept = ids.length > 0 ? [] : other;
  return kind === "node" ? { nodeIds: ids, edgeIds: kept } : { nodeIds: kept, edgeIds: ids };
}
