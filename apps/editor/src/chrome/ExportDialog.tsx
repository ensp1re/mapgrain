import { useState } from "react";
import { THEME, type Theme } from "@mapgrain/document";
import { EXPORT_CHOICE, PNG_SCALE_OPTIONS } from "../constants/export.ts";
import { Button } from "../ui/Button.tsx";
import { Modal } from "../ui/Modal.tsx";
import { Select } from "../ui/Select.tsx";

export { EXPORT_CHOICE };

type ExportFormat = (typeof EXPORT_CHOICE)[keyof typeof EXPORT_CHOICE];

interface ExportDialogProps {
  open: boolean;
  theme: Theme;
  error: string | null;
  busy?: boolean;
  onTheme: (theme: Theme) => void;
  onExport: (format: ExportFormat, scale: number) => void;
  onCancel?: () => void;
  onClose: () => void;
}

/** Grouped so the list reads as three choices, not eight chips in a pile. */
const GROUPS: Array<{ label: string; note: string; items: Array<[ExportFormat, string]> }> = [
  {
    label: "Image",
    note: "Scaled by the PNG factor above.",
    items: [
      [EXPORT_CHOICE.PNG, "PNG"],
      [EXPORT_CHOICE.SVG, "SVG"],
      [EXPORT_CHOICE.JPEG, "JPEG"],
      [EXPORT_CHOICE.WEBP, "WebP"],
      [EXPORT_CHOICE.CLIPBOARD, "Copy to clipboard"],
    ],
  },
  {
    label: "Document",
    note: "HTML opens offline with search and focus. JSON reopens here.",
    items: [
      [EXPORT_CHOICE.HTML, "HTML"],
      [EXPORT_CHOICE.JSON, "JSON"],
    ],
  },
  {
    label: "Motion",
    note: "Records the walkthrough steps as they play.",
    items: [[EXPORT_CHOICE.STORY_WEBM, "Story WebM"]],
  },
];

export function ExportDialog({
  open,
  theme,
  error,
  busy = false,
  onTheme,
  onExport,
  onCancel,
  onClose,
}: ExportDialogProps) {
  const [scale, setScale] = useState("2");
  return (
    <Modal
      open={open}
      title="Export"
      onClose={onClose}
      footer={busy ? <Button onClick={onCancel}>Cancel recording</Button> : null}
    >
      <div className="export-settings">
        <label>
          Theme
          <Select
            label="Export theme"
            value={theme}
            options={[
              { value: THEME.DARK, label: "Dark" },
              { value: THEME.LIGHT, label: "Light" },
            ]}
            onChange={(value) => onTheme(value as Theme)}
          />
        </label>
        <label>
          PNG scale
          <Select label="PNG scale" value={scale} options={[...PNG_SCALE_OPTIONS]} onChange={setScale} />
        </label>
      </div>
      {GROUPS.map((group) => (
        <section key={group.label} className="export-group">
          <h3>{group.label}</h3>
          <p>{group.note}</p>
          <div className="export-actions">
            {group.items.map(([format, label]) => (
              <Button key={format} onClick={() => onExport(format, Number(scale))}>
                {label}
              </Button>
            ))}
          </div>
        </section>
      ))}
      {busy ? (
        <p className="edit-error" role="status">
          Recording story…
        </p>
      ) : null}
      {error ? <p className="edit-error">{error}</p> : null}
    </Modal>
  );
}
