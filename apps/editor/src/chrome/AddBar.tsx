import type { NodeKind } from "@mapgrain/document";
import { ADDABLE_KINDS } from "../create/nodes.ts";
import { Button } from "../ui/Button.tsx";

interface AddBarProps {
  onAddNode: (kind: NodeKind) => void;
  onAddGroup: () => void;
  onConnect: () => void;
}

export function AddBar({ onAddNode, onAddGroup, onConnect }: AddBarProps) {
  return (
    <div className="add-bar" role="toolbar" aria-label="Library">
      {ADDABLE_KINDS.map((kind) => (
        <Button key={kind} onClick={() => onAddNode(kind)}>
          Add {kind}
        </Button>
      ))}
      <Button onClick={onAddGroup}>Add group</Button>
      <Button onClick={onConnect}>Connect selected</Button>
    </div>
  );
}
