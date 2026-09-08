import { useState } from "react";
import { THEME, type Theme } from "@mapgrain/document";
import { EXPORT_CHOICE, PNG_SCALE_OPTIONS } from "../constants/export.ts";
import { Select } from "../ui/Select.tsx";

export { EXPORT_CHOICE };

interface ExportDialogProps {
  open: boolean;
  theme: Theme;
  error: string | null;
  onTheme: (theme: Theme) => void;
  onExport: (format: (typeof EXPORT_CHOICE)[keyof typeof EXPORT_CHOICE], scale: number) => void;
  onClose: () => void;
}

export function ExportDialog({ open, theme, error, onTheme, onExport, onClose }: ExportDialogProps) {
  const [scale, setScale] = useState("2");
  if (!open) return null;
  return (
    <div className="export-dialog" role="dialog" aria-label="Export">
      <div className="pane-label">Export</div>
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
        <Select
          label="PNG scale"
          value={scale}
          options={[...PNG_SCALE_OPTIONS]}
          onChange={setScale}
        />
      </label>
      <div className="export-actions">
        <button type="button" className="text-btn" onClick={() => onExport(EXPORT_CHOICE.SVG, Number(scale))}>
          SVG
        </button>
        <button type="button" className="text-btn" onClick={() => onExport(EXPORT_CHOICE.PNG, Number(scale))}>
          PNG
        </button>
        <button type="button" className="text-btn" onClick={() => onExport(EXPORT_CHOICE.HTML, Number(scale))}>
          HTML
        </button>
        <button type="button" className="text-btn" onClick={() => onExport(EXPORT_CHOICE.JSON, Number(scale))}>
          JSON
        </button>
      </div>
      {error ? <p className="edit-error">{error}</p> : null}
      <button type="button" className="text-btn" onClick={onClose}>
        Close
      </button>
    </div>
  );
}
