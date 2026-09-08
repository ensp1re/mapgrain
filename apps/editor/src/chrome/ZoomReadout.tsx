import { Panel, useViewport } from "@xyflow/react";

export function ZoomReadout() {
  const { zoom } = useViewport();
  return (
    <Panel position="bottom-left" className="zoom-readout" aria-live="polite">
      {Math.round(zoom * 100)}%
    </Panel>
  );
}
