import type { NodeKind } from "@mapgrain/document";
import { ADDABLE_KINDS } from "../create/nodes.ts";

interface AddBarProps {
  onAddNode: (kind: NodeKind) => void;
  onAddGroup: () => void;
  onConnect: () => void;
}

export function AddBar({ onAddNode, onAddGroup, onConnect }: AddBarProps) {
  return (
    <div className="add-bar" role="toolbar" aria-label="Add">
      {ADDABLE_KINDS.map((kind) => (
        <button key={kind} type="button" className="text-btn" onClick={() => onAddNode(kind)}>
          Add {kind}
        </button>
      ))}
      <button type="button" className="text-btn" onClick={onAddGroup}>
        Add group
      </button>
      <button type="button" className="text-btn" onClick={onConnect}>
        Connect selected
      </button>
    </div>
  );
}