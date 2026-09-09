import { useRef, useState } from "react";
import { THEME, type Theme } from "@mapgrain/document";
import { EXPORT_CHOICE, PNG_SCALE_OPTIONS } from "../constants/export.ts";
import { Button } from "../ui/Button.tsx";
import { Pane } from "../ui/Pane.tsx";
import { Select } from "../ui/Select.tsx";
import { useFocusTrap } from "./focusTrap.ts";

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
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open, onClose);
  if (!open) return null;
  return (
    <div ref={dialogRef}>
    <Pane className="export-dialog" title="Export" role="dialog" as="div">
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
        <Button onClick={() => onExport(EXPORT_CHOICE.SVG, Number(scale))}>SVG</Button>
        <Button onClick={() => onExport(EXPORT_CHOICE.PNG, Number(scale))}>PNG</Button>
        <Button onClick={() => onExport(EXPORT_CHOICE.JPEG, Number(scale))}>JPEG</Button>
        <Button onClick={() => onExport(EXPORT_CHOICE.WEBP, Number(scale))}>WebP</Button>
        <Button onClick={() => onExport(EXPORT_CHOICE.CLIPBOARD, Number(scale))}>Copy image</Button>
        <Button onClick={() => onExport(EXPORT_CHOICE.HTML, Number(scale))}>HTML</Button>
        <Button onClick={() => onExport(EXPORT_CHOICE.JSON, Number(scale))}>JSON</Button>
      </div>
      {error ? <p className="edit-error">{error}</p> : null}
      <Button onClick={onClose}>Close</Button>
    </Pane>
    </div>
  );
}
