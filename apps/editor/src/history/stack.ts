export interface HistoryStack<T> {
  past: T[];
  present: T;
  future: T[];
}

export function createHistory<T>(present: T): HistoryStack<T> {
  return { past: [], present, future: [] };
}

/** Every entry is a whole document clone, so the stack is capped rather than unbounded. */
export const HISTORY_LIMIT = 100;

export function pushHistory<T>(
  stack: HistoryStack<T>,
  next: T,
  limit = HISTORY_LIMIT,
): HistoryStack<T> {
  if (Object.is(stack.present, next)) return stack;
  const past = [...stack.past, stack.present];
  return { past: past.slice(-limit), present: next, future: [] };
}

export function undoHistory<T>(stack: HistoryStack<T>): HistoryStack<T> {
  const previous = stack.past.at(-1);
  if (previous === undefined) return stack;
  return {
    past: stack.past.slice(0, -1),
    present: previous,
    future: [stack.present, ...stack.future],
  };
}

export function redoHistory<T>(stack: HistoryStack<T>): HistoryStack<T> {
  const [next, ...rest] = stack.future;
  if (next === undefined) return stack;
  return {
    past: [...stack.past, stack.present],
    present: next,
    future: rest,
  };
}
