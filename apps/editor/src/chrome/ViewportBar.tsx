import { Panel, useReactFlow, useViewport } from "@xyflow/react";

interface ViewportBarProps {
  canFocus: boolean;
  edgesHidden: boolean;
  onFitAll: () => void;
  onFocus: () => void;
  onToggleEdges: () => void;
}

export function ViewportBar({
  canFocus,
  edgesHidden,
  onFitAll,
  onFocus,
  onToggleEdges,
}: ViewportBarProps) {
  const { zoom } = useViewport();
  const { zoomIn, zoomOut } = useReactFlow();
  return (
    <Panel position="bottom-left" className="viewport-bar" role="group" aria-label="Viewport">
      <button
        type="button"
        className="text-btn"
        aria-label="Zoom out"
        onClick={() => void zoomOut({ duration: 80 })}
      >
        −
      </button>
      <span className="zoom-readout" aria-live="polite">
        {Math.round(zoom * 100)}%
      </span>
      <button
        type="button"
        className="text-btn"
        aria-label="Zoom in"
        onClick={() => void zoomIn({ duration: 80 })}
      >
        +
      </button>
      <button
        type="button"
        className="text-btn"
        aria-label="Fit all, show the whole diagram"
        title="Fit all"
        onClick={onFitAll}
      >
        <span className="fit-label">Fit all</span>
      </button>
      <button
        type="button"
        className={edgesHidden ? "text-btn is-on" : "text-btn"}
        aria-pressed={edgesHidden}
        aria-label={edgesHidden ? "Show connections" : "Hide connections"}
        title={edgesHidden ? "Show connections" : "Hide connections, read the components alone"}
        onClick={onToggleEdges}
      >
        <span className="fit-label">{edgesHidden ? "Show links" : "Hide links"}</span>
      </button>
      <button
        type="button"
        className="text-btn"
        aria-label="Focus selection"
        title="Focus"
        onClick={onFocus}
        disabled={!canFocus}
      >
        Focus
      </button>
    </Panel>
  );
}
