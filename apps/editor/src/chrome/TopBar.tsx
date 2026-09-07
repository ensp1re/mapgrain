interface TopBarProps {
  title: string;
  onCommand: () => void;
  onTheme: () => void;
  onExport: () => void;
  onToggleOutline: () => void;
}

export function TopBar({ title, onCommand, onTheme, onExport, onToggleOutline }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="brand">Mapgrain</div>
      <div className="doc-title">{title}</div>
      <div className="spacer" />
      <span className="save-state">Saved</span>
      <button type="button" className="text-btn" onClick={onToggleOutline}>
        Outline
      </button>
      <button type="button" className="text-btn" onClick={onTheme}>
        Theme
      </button>
      <button type="button" className="text-btn" onClick={onCommand}>
        Commands
      </button>
      <button type="button" className="text-btn primary" onClick={onExport}>
        Export
      </button>
    </header>
  );
}
