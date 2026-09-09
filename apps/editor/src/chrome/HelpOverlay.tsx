import { useRef } from "react";
import { commandsByScope } from "../constants/commands.ts";
import { shortcutLabel } from "../keyboard/shortcutLabel.ts";
import { useFocusTrap } from "./focusTrap.ts";

interface HelpOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function HelpOverlay({ open, onClose }: HelpOverlayProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open, onClose);
  if (!open) return null;
  const groups = commandsByScope();
  return (
    <div className="command-scrim" onClick={onClose}>
      <div
        ref={dialogRef}
        className="help-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="help-head">
          <div className="pane-label" id="help-title">
            Keyboard shortcuts
          </div>
          <button
            type="button"
            className="text-btn ghost pane-close"
            onClick={onClose}
            aria-label="Close Keyboard shortcuts"
          >
            ×
          </button>
        </div>
        <p className="help-lead">
          Command menu <kbd>{shortcutLabel("⌘K")}</kbd>
        </p>
        {groups.map((group) => (
          <section key={group.scope} className="help-group">
            <h2>{group.label}</h2>
            {group.items.map((item) => (
              <div key={item.id} className="help-row">
                <span>{item.label}</span>
                <kbd>{shortcutLabel(item.shortcut)}</kbd>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
