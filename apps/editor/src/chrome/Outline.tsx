import type { FlowNodeDraft } from "../diagram/sceneToFlow.ts";

interface OutlineProps {
  nodes: FlowNodeDraft[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function Outline({ nodes, selectedId, onSelect }: OutlineProps) {
  return (
    <nav className="outline" aria-label="Components">
      <div className="pane-label">Outline</div>
      {nodes.map((node) => (
        <button
          key={node.id}
          type="button"
          className={[
            "outline-row",
            node.type === "group" ? "is-group" : "",
            selectedId === node.id ? "is-selected" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => onSelect(node.id)}
        >
          <span>{node.data.label}</span>
          {node.data.kind ? <span className="kind">{node.data.kind}</span> : null}
        </button>
      ))}
    </nav>
  );
}
