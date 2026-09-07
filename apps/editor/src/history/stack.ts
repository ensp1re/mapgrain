export interface HistoryStack<T> {
  past: T[];
  present: T;
  future: T[];
}

export function createHistory<T>(present: T): HistoryStack<T> {
  return { past: [], present, future: [] };
}

export function pushHistory<T>(stack: HistoryStack<T>, next: T): HistoryStack<T> {
  if (Object.is(stack.present, next)) return stack;
  return { past: [...stack.past, stack.present], present: next, future: [] };
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
