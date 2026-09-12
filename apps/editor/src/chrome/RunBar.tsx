import type { DiagramDocument } from "@mapgrain/document";
import type { RunState, RunTransition } from "../types/run.ts";

interface RunBarProps {
  document: DiagramDocument;
  state: RunState;
  transitions: RunTransition[];
  finished: boolean;
  onFire: (edgeId: string) => void;
  onReset: () => void;
  onExit: () => void;
}

function labelOf(document: DiagramDocument, nodeId: string): string {
  return document.nodes.find((node) => node.id === nodeId)?.label ?? nodeId;
}

/** Fires transitions against a copy of the reader's position. The document never changes. */
export function RunBar({ document, state, transitions, finished, onFire, onReset, onExit }: RunBarProps) {
  return (
    <div className="run-bar" role="group" aria-label="Run">
      <div className="run-now">
        <span className="run-label">Now</span>
        <strong aria-live="polite">{labelOf(document, state.activeId)}</strong>
      </div>
      <div className="run-moves">
        {finished ? (
          <span className="run-done">Nothing left to fire.</span>
        ) : (
          transitions.map((move) => (
            <button
              key={move.edgeId}
              type="button"
              className="text-btn run-move"
              onClick={() => onFire(move.edgeId)}
              title={`Go to ${labelOf(document, move.targetId)}`}
            >
              {move.label}
            </button>
          ))
        )}
      </div>
      {state.log.length > 0 ? (
        <ol className="run-log" aria-label="Event log">
          {state.log.slice(-4).map((event, index) => (
            <li key={`${event.edgeId}:${index}`}>
              {labelOf(document, event.fromId)} <span aria-hidden="true">→</span>{" "}
              {labelOf(document, event.toId)} <small>{event.label}</small>
            </li>
          ))}
        </ol>
      ) : null}
      <div className="run-actions">
        <button type="button" className="text-btn" onClick={onReset} disabled={state.log.length === 0}>
          Reset
        </button>
        <button type="button" className="text-btn ghost" onClick={onExit}>
          Done
        </button>
      </div>
    </div>
  );
}
