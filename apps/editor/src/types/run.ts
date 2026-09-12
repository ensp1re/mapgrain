export interface RunTransition {
  edgeId: string;
  targetId: string;
  /** What the reader clicks: the outcome, the guard, or the label. */
  label: string;
}

export interface RunEvent {
  edgeId: string;
  fromId: string;
  toId: string;
  label: string;
}

export interface RunState {
  activeId: string;
  log: readonly RunEvent[];
}
