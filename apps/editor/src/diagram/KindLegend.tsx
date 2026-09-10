import { kindLegendLabel } from "@mapgrain/scene";
import type { NodeKind } from "@mapgrain/document";

interface KindLegendProps {
  kinds: NodeKind[];
}

export function KindLegend({ kinds }: KindLegendProps) {
  if (kinds.length === 0) return null;
  return (
    <details className="kind-legend" open>
      <summary>Kinds</summary>
      <ul aria-label="Component kinds">
        {kinds.map((kind) => (
          <li key={kind} data-legend-kind={kind}>
            <span className="kind-swatch" data-kind-fill={kind} />
            {kindLegendLabel(kind)}
          </li>
        ))}
      </ul>
    </details>
  );
}
