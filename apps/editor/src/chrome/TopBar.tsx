interface TopBarProps {
  title: string;
  saveState: string;
  canUndo: boolean;
  canRedo: boolean;
  presenting: boolean;
  chatOpen: boolean;
  onTitleChange: (value: string) => void;
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
  onTitleChange,
  onUndo,
  onRedo,
  onPresent,
  onExport,
  onCommand,
  onToggleOutline,
  onToggleChat,
}: TopBarProps) {
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
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
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
