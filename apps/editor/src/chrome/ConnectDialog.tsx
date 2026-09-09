import {
  EDGE_DIRECTION,
  defaultEdgeType,
  type DocumentKind,
  type EdgeDirection,
  type EdgeType,
} from "@mapgrain/document";
import { useRef, useState } from "react";
import { directionLabel } from "../export/labels.ts";
import type { ConnectionDraft, PendingConnection } from "../types/editor.ts";
import { Select } from "../ui/Select.tsx";
import { useFocusTrap } from "./focusTrap.ts";

interface ConnectDialogProps {
  pending: PendingConnection;
  documentKind: DocumentKind;
  edgeTypes: readonly EdgeType[];
  onConfirm: (draft: ConnectionDraft) => void;
  onCancel: () => void;
}

export function ConnectDialog({
  pending,
  documentKind,
  edgeTypes,
  onConfirm,
  onCancel,
}: ConnectDialogProps) {
  const [type, setType] = useState<EdgeType>(defaultEdgeType(documentKind));
  const [direction, setDirection] = useState<EdgeDirection>(EDGE_DIRECTION.FORWARD);
  const [label, setLabel] = useState("");
  const dialogRef = useRef<HTMLFormElement>(null);
  useFocusTrap(dialogRef, true, onCancel);

  return (
    <form
      ref={dialogRef}
      className="connect-dialog"
      role="dialog"
      aria-modal="true"
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
          options={edgeTypes.map((value) => ({ value, label: value }))}
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
