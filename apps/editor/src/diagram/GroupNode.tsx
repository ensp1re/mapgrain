import type { NodeProps } from "@xyflow/react";
import { useEffect, useState } from "react";
import type { GroupNodeData } from "../types/flow.ts";

export function GroupNode({ data, selected }: NodeProps) {
  const group = data as GroupNodeData;
  const [draft, setDraft] = useState(group.label);

  useEffect(() => {
    if (group.editing) setDraft(group.label);
  }, [group.editing, group.label]);

  return (
    <div
      className={selected ? "group-frame is-selected" : "group-frame"}
      onDoubleClick={() => {
        if (!group.editing) group.onStartEdit();
      }}
    >
      {group.editing ? (
        <input
          className="label-input group-label"
          aria-label="Group label"
          value={draft}
          autoFocus
          onChange={(event) => setDraft(event.target.value)}
          onClick={(event) => event.stopPropagation()}
          onBlur={() => group.onCommitLabel(draft)}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Enter") group.onCommitLabel(draft);
            if (event.key === "Escape") group.onCancelEdit();
          }}
        />
      ) : (
        <div className="group-label">{group.label}</div>
      )}
    </div>
  );
}
