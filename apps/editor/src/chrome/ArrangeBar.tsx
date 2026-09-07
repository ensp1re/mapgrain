import type { ArrangeState } from "../types/arrange.ts";

interface ArrangeBarProps {
  state: ArrangeState;
  onApply: () => void;
  onDiscard: () => void;
}

export function ArrangeBar({ state, onApply, onDiscard }: ArrangeBarProps) {
  if (state.status === "idle") return null;
  if (state.status === "working") {
    return (
      <div className="arrange-bar" role="status">
        Arranging…
      </div>
    );
  }
  if (state.status === "conflict") {
    return (
      <div className="arrange-bar is-conflict" role="alert">
        <div>
          <strong>Pin conflict</strong>
          <p>{state.message}</p>
          <p>Overlapping: {state.overlappingNodeIds.join(", ")}</p>
        </div>
        <button type="button" className="text-btn" onClick={onDiscard}>
          Discard
        </button>
      </div>
    );
  }
  return (
    <div className="arrange-bar" role="status">
      <span>Preview arrangement. Pinned nodes keep their positions.</span>
      <div className="arrange-actions">
        <button type="button" className="text-btn" onClick={onDiscard}>
          Discard
        </button>
        <button type="button" className="text-btn primary" onClick={onApply}>
          Apply
        </button>
      </div>
    </div>
  );
}
