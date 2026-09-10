import { Panel, useReactFlow, useViewport } from "@xyflow/react";

interface ViewportBarProps {
  canFocus: boolean;
  onFitAll: () => void;
  onFocus: () => void;
}

export function ViewportBar({ canFocus, onFitAll, onFocus }: ViewportBarProps) {
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
