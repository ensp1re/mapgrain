import { useEffect, useRef, useState } from "react";
import { SAVE_STATE } from "../constants/persist.ts";
import type { SaveState } from "../types/persist.ts";
import { Overlay } from "../ui/Overlay.tsx";

interface TopBarProps {
  title: string;
  saveState: SaveState;
  saveError?: string | null;
  onBackup: () => void;
  onRetrySave?: () => void;
  onReloadSaved?: () => void;
  canUndo: boolean;
  canRedo: boolean;
  presenting: boolean;
  onTitleCommit: (value: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onNew: () => void;
  onArrange: () => void;
  onPresent: () => void;
  onExport: () => void;
  onCommand: () => void;
  onHelp: () => void;
  onToggleOutline: () => void;
  onToggleDetails?: () => void;
}

export function TopBar({
  title,
  saveState,
  saveError,
  canUndo,
  canRedo,
  presenting,
  onBackup,
  onRetrySave,
  onReloadSaved,
  onTitleCommit,
  onUndo,
  onRedo,
  onNew,
  onArrange,
  onPresent,
  onExport,
  onCommand,
  onHelp,
  onToggleOutline,
  onToggleDetails,
}: TopBarProps) {
  const [draft, setDraft] = useState(title);
  const [moreOpen, setMoreOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const barRef = useRef<HTMLElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setDraft(title);
  }, [title]);

  useEffect(() => {
    const bar = barRef.current;
    const measure = measureRef.current;
    if (!bar || !measure) return;
    const update = () => {
      const identity = [...bar.querySelectorAll<HTMLElement>("[data-identity]")].reduce(
        (sum, node) => sum + node.getBoundingClientRect().width,
        0,
      );
      const available = bar.clientWidth - identity - 120;
      setCollapsed(measure.scrollWidth > available);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(bar);
    observer.observe(measure);
    return () => observer.disconnect();
  }, [title, saveState, saveError]);

  const commitTitle = () => {
    const next = draft.trim();
    if (next === title) {
      setDraft(title);
      return;
    }
    onTitleCommit(next);
  };

  if (presenting) {
    return (
      <header className="topbar">
        <div className="brand">Mapgrain</div>
        <div className="doc-title">{title}</div>
        <div className="spacer" />
        <button type="button" className="text-btn primary" onClick={onPresent}>
          Exit present
        </button>
      </header>
    );
  }

  const overflowItems = [
    { label: "Undo", onClick: onUndo, disabled: !canUndo },
    { label: "Redo", onClick: onRedo, disabled: !canRedo },
    { label: "New", onClick: onNew },
    { label: "Present", onClick: onPresent },
    { label: "Outline", onClick: onToggleOutline },
    { label: "Details", onClick: onToggleDetails ?? onToggleOutline },
    { label: "Commands", onClick: onCommand },
    { label: "Help", onClick: onHelp },
    { label: "Chat", onClick: undefined, disabled: true, ariaLabel: "Chat is unavailable" },
  ];

  return (
    <header className="topbar" ref={barRef}>
      <div className="brand" data-identity="">
        Mapgrain
      </div>
      <label className="title-field" data-identity="">
        <span className="visually-hidden">Document title</span>
        <input
          aria-label="Document title"
          title={title}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitTitle}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              (event.currentTarget as HTMLInputElement).blur();
            }
            if (event.key === "Escape") {
              setDraft(title);
              event.currentTarget.blur();
            }
          }}
        />
      </label>
      <span className="save-state" aria-live="polite" data-identity="">
        {saveState}
      </span>
      {saveError ? (
        <span className="save-error" role="status" data-identity="">
          {saveError}
        </span>
      ) : null}
      {saveState === SAVE_STATE.RECOVERY || saveState === SAVE_STATE.TEMPORARY ? (
        <span data-identity="">
          <button type="button" className="text-btn" onClick={onBackup}>
            Download backup
          </button>
          {saveState === SAVE_STATE.RECOVERY && onRetrySave ? (
            <button type="button" className="text-btn" onClick={onRetrySave}>
              Retry save
            </button>
          ) : null}
          {saveState === SAVE_STATE.RECOVERY && onReloadSaved ? (
            <button type="button" className="text-btn" onClick={onReloadSaved}>
              Reload saved
            </button>
          ) : null}
        </span>
      ) : null}
      <div className="spacer" />
      <div className="topbar-actions">
        <button type="button" className="text-btn" onClick={onArrange}>
          Arrange
        </button>
        <button type="button" className="text-btn primary" onClick={onExport}>
          Export
        </button>
        <div className={collapsed ? "topbar-secondary is-collapsed" : "topbar-secondary"}>
          <button type="button" className="text-btn ghost topbar-wide" onClick={onUndo} disabled={!canUndo}>
            Undo
          </button>
          <button type="button" className="text-btn ghost topbar-wide" onClick={onRedo} disabled={!canRedo}>
            Redo
          </button>
          <button type="button" className="text-btn ghost topbar-wide" onClick={onNew}>
            New
          </button>
          <button type="button" className="text-btn ghost topbar-wide" onClick={onPresent}>
            Present
          </button>
          <button type="button" className="text-btn ghost topbar-wide" onClick={onToggleOutline}>
            Outline
          </button>
          <button type="button" className="text-btn ghost topbar-wide" onClick={onCommand}>
            Commands
          </button>
          <button type="button" className="text-btn ghost topbar-wide" onClick={onHelp}>
            Help
          </button>
        </div>
        <button
          ref={moreRef}
          type="button"
          className={collapsed ? "text-btn ghost topbar-more is-needed" : "text-btn ghost topbar-more"}
          aria-label="More"
          aria-expanded={moreOpen}
          aria-haspopup="menu"
          onClick={() => setMoreOpen((value) => !value)}
        >
          ···
        </button>
        <Overlay
          open={moreOpen}
          anchorRef={moreRef}
          onClose={() => setMoreOpen(false)}
          label="More actions"
        >
          {overflowItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className="text-btn"
              disabled={item.disabled}
              aria-label={item.ariaLabel}
              onClick={() => {
                item.onClick?.();
                setMoreOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </Overlay>
      </div>
      <div className="topbar-measure" ref={measureRef} aria-hidden="true">
        <button type="button" className="text-btn">
          Undo
        </button>
        <button type="button" className="text-btn">
          Redo
        </button>
        <button type="button" className="text-btn">
          New
        </button>
        <button type="button" className="text-btn">
          Present
        </button>
        <button type="button" className="text-btn">
          Outline
        </button>
        <button type="button" className="text-btn">
          Commands
        </button>
        <button type="button" className="text-btn">
          Help
        </button>
      </div>
    </header>
  );
}
