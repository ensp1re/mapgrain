import { EDGE_DIRECTION, EDGE_TYPE, type EdgeDirection, type EdgeType } from "@mapgrain/document";
import { useState } from "react";
import { directionLabel } from "../export/labels.ts";
import type { ConnectionDraft, PendingConnection } from "../types/editor.ts";
import { Select } from "../ui/Select.tsx";

interface ConnectDialogProps {
  pending: PendingConnection;
  onConfirm: (draft: ConnectionDraft) => void;
  onCancel: () => void;
}

export function ConnectDialog({ pending, onConfirm, onCancel }: ConnectDialogProps) {
  const [type, setType] = useState<EdgeType>(EDGE_TYPE.CALLS);
  const [direction, setDirection] = useState<EdgeDirection>(EDGE_DIRECTION.FORWARD);
  const [label, setLabel] = useState("");

  return (
    <form
      className="connect-dialog"
      aria-label="New connection"
      onSubmit={(event) => {
        event.preventDefault();
        onConfirm({ type, direction, label: label.trim() });
      }}
    >
      <div className="pane-label">New connection</div>
      <p>
        {pending.source} → {pending.target}
      </p>
      <label>
        Meaning
        <Select
          label="Relation type"
          value={type}
          options={Object.values(EDGE_TYPE).map((value) => ({ value, label: value }))}
          onChange={(value) => setType(value as EdgeType)}
        />
      </label>
      <label>
        Direction
        <Select
          label="Relation direction"
          value={direction}
          options={Object.values(EDGE_DIRECTION).map((value) => ({
            value,
            label: directionLabel(value),
          }))}
          onChange={(value) => setDirection(value as EdgeDirection)}
        />
      </label>
      <label>
        Label
        <input
          aria-label="Relation label"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
      </label>
      <div className="connect-actions">
        <button type="button" className="text-btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="text-btn primary">
          Connect
        </button>
      </div>
    </form>
  );
}
