import { useEffect, useState } from "react";
import { SAVE_STATE } from "../constants/persist.ts";
import type { SaveState } from "../types/persist.ts";

interface TopBarProps {
  title: string;
  saveState: SaveState;
  onBackup: () => void;
  canUndo: boolean;
  canRedo: boolean;
  presenting: boolean;
  chatOpen: boolean;
  onTitleCommit: (value: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onNew: () => void;
  onArrange: () => void;
  onPresent: () => void;
  onExport: () => void;
  onCommand: () => void;
  onToggleOutline: () => void;
  onToggleChat: () => void;
}

export function TopBar({
  title,
  saveState,
  canUndo,
  canRedo,
  presenting,
  chatOpen,
  onBackup,
  onTitleCommit,
  onUndo,
  onRedo,
  onNew,
  onArrange,
  onPresent,
  onExport,
  onCommand,
  onToggleOutline,
  onToggleChat,
}: TopBarProps) {
  const [draft, setDraft] = useState(title);
  useEffect(() => {
    setDraft(title);
  }, [title]);

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
  return (
    <header className="topbar">
      <div className="brand">Mapgrain</div>
      <label className="title-field">
        <span className="visually-hidden">Document title</span>
        <input
          aria-label="Document title"
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
      <span className="save-state" aria-live="polite">
        {saveState}
      </span>
      {saveState === SAVE_STATE.RECOVERY || saveState === SAVE_STATE.TEMPORARY ? (
        <button type="button" className="text-btn" onClick={onBackup}>
          Download backup
        </button>
      ) : null}
      <div className="spacer" />
      <div className="topbar-actions">
        <button type="button" className="text-btn" onClick={onArrange}>
          Arrange
        </button>
        <button type="button" className="text-btn primary" onClick={onExport}>
          Export
        </button>
        <button type="button" className="text-btn topbar-wide" onClick={onUndo} disabled={!canUndo}>
          Undo
        </button>
        <button type="button" className="text-btn topbar-wide" onClick={onRedo} disabled={!canRedo}>
          Redo
        </button>
        <button type="button" className="text-btn topbar-wide" onClick={onNew}>
          New
        </button>
        <button type="button" className="text-btn topbar-wide" onClick={onPresent}>
          Present
        </button>
        <button type="button" className="text-btn topbar-wide" onClick={onToggleOutline}>
          Outline
        </button>
        <button type="button" className="text-btn topbar-wide" onClick={onCommand}>
          Commands
        </button>
        <button
          type="button"
          className={chatOpen ? "text-btn is-on topbar-wide" : "text-btn topbar-wide"}
          aria-pressed={chatOpen}
          onClick={onToggleChat}
        >
          Chat
        </button>
        <details className="topbar-more">
          <summary className="text-btn">More</summary>
          <div className="topbar-more-menu">
            <button type="button" className="text-btn" onClick={onUndo} disabled={!canUndo}>
              Undo
            </button>
            <button type="button" className="text-btn" onClick={onRedo} disabled={!canRedo}>
              Redo
            </button>
            <button type="button" className="text-btn" onClick={onNew}>
              New
            </button>
            <button type="button" className="text-btn" onClick={onPresent}>
              Present
            </button>
            <button type="button" className="text-btn" onClick={onToggleOutline}>
              Outline
            </button>
            <button type="button" className="text-btn" onClick={onCommand}>
              Commands
            </button>
            <button
              type="button"
              className={chatOpen ? "text-btn is-on" : "text-btn"}
              aria-pressed={chatOpen}
              onClick={onToggleChat}
            >
              Chat
            </button>
          </div>
        </details>
      </div>
    </header>
  );
}
