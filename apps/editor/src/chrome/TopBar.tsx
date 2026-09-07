import { useEffect, useState } from "react";

interface TopBarProps {
  title: string;
  saveState: string;
  canUndo: boolean;
  canRedo: boolean;
  presenting: boolean;
  chatOpen: boolean;
  onTitleCommit: (value: string) => void;
  onUndo: () => void;
  onRedo: () => void;
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
  onTitleCommit,
  onUndo,
  onRedo,
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
      <span className="save-state">{saveState}</span>
      <div className="spacer" />
      <button type="button" className="text-btn" onClick={onUndo} disabled={!canUndo}>
        Undo
      </button>
      <button type="button" className="text-btn" onClick={onRedo} disabled={!canRedo}>
        Redo
      </button>
      <button type="button" className="text-btn" onClick={onPresent}>
        Present
      </button>
      <button type="button" className="text-btn primary" onClick={onExport}>
        Export
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
    </header>
  );
}
