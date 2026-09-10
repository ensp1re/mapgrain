import {
  conversionSummary,
  convertDocument,
  validateDocument,
  type DiagramDocument,
  type DocumentKind,
} from "@mapgrain/document";
import { useMemo, useRef } from "react";
import { MODE_CHOICES } from "../create/modes.ts";
import { Pane } from "../ui/Pane.tsx";
import { Select } from "../ui/Select.tsx";
import { useFocusTrap } from "./focusTrap.ts";

interface ConvertKindDialogProps {
  open: boolean;
  document: DiagramDocument;
  target: DocumentKind;
  onTarget: (kind: DocumentKind) => void;
  onApply: () => void;
  onClose: () => void;
}

export function ConvertKindDialog({
  open,
  document,
  target,
  onTarget,
  onApply,
  onClose,
}: ConvertKindDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open, onClose);
  const preview = useMemo(() => convertDocument(document, target), [document, target]);
  const valid = useMemo(() => validateDocument(preview.document), [preview]);
  const dropped = [...preview.nodes, ...preview.edges].filter((item) => item.action === "drop");
  if (!open) return null;
  const canApply = target !== document.kind && valid.ok;
  return (
    <div ref={dialogRef}>
      <Pane className="convert-dialog" title="Switch diagram kind" role="dialog" as="div">
        <label>
          Kind
          <Select
            label="Diagram kind"
            value={target}
            options={MODE_CHOICES.map((choice) => ({ value: choice.kind, label: choice.title }))}
            onChange={(value) => onTarget(value as DocumentKind)}
          />
        </label>
        <p>{conversionSummary(preview)}</p>
        {dropped.length > 0 ? (
          <p>
            Dropped: {dropped.map((item) => item.label).slice(0, 8).join(", ")}
            {dropped.length > 8 ? "…" : ""}
          </p>
        ) : null}
        {valid.ok ? null : (
          <p role="status">{valid.errors[0]?.message ?? "Converted document is invalid."}</p>
        )}
        <div className="convert-actions">
          <button type="button" className="text-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="text-btn primary" onClick={onApply} disabled={!canApply}>
            Apply
          </button>
        </div>
      </Pane>
    </div>
  );
}
