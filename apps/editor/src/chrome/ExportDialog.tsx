import { THEME, type Theme } from "@mapgrain/document";
import { EXPORT_CHOICE } from "../constants/export.ts";

export { EXPORT_CHOICE };

interface ExportDialogProps {
  open: boolean;
  theme: Theme;
  error: string | null;
  onTheme: (theme: Theme) => void;
  onExport: (format: (typeof EXPORT_CHOICE)[keyof typeof EXPORT_CHOICE]) => void;
  onClose: () => void;
}

export function ExportDialog({ open, theme, error, onTheme, onExport, onClose }: ExportDialogProps) {
  if (!open) return null;
  return (
    <div className="export-dialog" role="dialog" aria-label="Export">
      <div className="pane-label">Export</div>
      <label>
        Theme
        <select aria-label="Export theme" value={theme} onChange={(event) => onTheme(event.target.value as Theme)}>
          <option value={THEME.DARK}>Dark</option>
          <option value={THEME.LIGHT}>Light</option>
        </select>
      </label>
      <div className="export-actions">
        <button type="button" className="text-btn" onClick={() => onExport(EXPORT_CHOICE.SVG)}>
          SVG
        </button>
        <button type="button" className="text-btn" onClick={() => onExport(EXPORT_CHOICE.PNG)}>
          PNG
        </button>
        <button type="button" className="text-btn" onClick={() => onExport(EXPORT_CHOICE.HTML)}>
          HTML
        </button>
        <button type="button" className="text-btn" onClick={() => onExport(EXPORT_CHOICE.JSON)}>
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
