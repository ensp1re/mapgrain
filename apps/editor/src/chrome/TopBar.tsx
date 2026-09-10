import { useEffect, useRef, useState } from "react";
import { SAVE_STATE } from "../constants/persist.ts";
import { COMMAND_ID, COMMANDS } from "../constants/commands.ts";
import { shortcutLabel } from "../keyboard/shortcutLabel.ts";
import type { SaveState } from "../types/persist.ts";
import { MenuItem, MenuSeparator } from "../ui/Menu.tsx";
import { Overlay } from "../ui/Overlay.tsx";
import {
  HEADER_LAYOUT,
  headerShowsArrange,
  headerShowsHistory,
  headerShowsPresent,
  stabilizeHeaderLayout,
  type HeaderLayout,
} from "./headerLayout.ts";

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
  onOpenFile: (file: File) => void;
  onArrange: () => void;
  onPresent: () => void;
  onExport: () => void;
  onCommand: () => void;
  onHelp: () => void;
  onToggleOutline: () => void;
  onToggleDetails?: () => void;
}

function commandShortcut(id: string): string {
  const spec = COMMANDS.find((item) => item.id === id);
  return spec?.shortcut ? shortcutLabel(spec.shortcut) : "";
}

function saveSlotLabel(saveState: SaveState): string {
  if (saveState === SAVE_STATE.SAVING || saveState === SAVE_STATE.FILE_SAVING) return "Saving…";
  if (saveState === SAVE_STATE.RECOVERY) return "Failed";
  if (saveState === SAVE_STATE.TEMPORARY) return "Local";
  return "Saved";
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
  onOpenFile,
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
  const [docOpen, setDocOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [layout, setLayout] = useState<HeaderLayout>(HEADER_LAYOUT.FULL);
  const barRef = useRef<HTMLElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const docRef = useRef<HTMLButtonElement>(null);
  const saveRef = useRef<HTMLButtonElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const failed = saveState === SAVE_STATE.RECOVERY || saveState === SAVE_STATE.TEMPORARY;

  useEffect(() => {
    setDraft(title);
  }, [title]);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const update = () => {
      setLayout((current) => stabilizeHeaderLayout(bar.clientWidth, current));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(bar);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

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

  const showArrange = headerShowsArrange(layout);
  const showPresent = headerShowsPresent(layout);
  const showHistory = headerShowsHistory(layout);

  return (
    <header className="topbar" ref={barRef} data-layout={layout}>
      <button
        ref={docRef}
        type="button"
        className="brand-menu"
        aria-haspopup="menu"
        aria-expanded={docOpen}
        aria-label="Document menu"
        onClick={() => setDocOpen((value) => !value)}
      >
        Mapgrain
      </button>
      <Overlay open={docOpen} anchorRef={docRef} onClose={() => setDocOpen(false)} align="start" pattern="menu" label="Document">
        <MenuItem
          onClick={() => {
            setDocOpen(false);
            onNew();
          }}
        >
          New diagram
        </MenuItem>
        <MenuItem
          onClick={() => {
            setDocOpen(false);
            fileRef.current?.click();
          }}
        >
          Open file
        </MenuItem>
      </Overlay>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        aria-hidden="true"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onOpenFile(file);
          event.target.value = "";
        }}
      />
      <label className="title-field">
        <span className="visually-hidden">Document title</span>
        <input
          aria-label="Document title"
          title={title}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={(event) => event.currentTarget.select()}
          onBlur={commitTitle}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
            if (event.key === "Escape") {
              setDraft(title);
              event.currentTarget.blur();
            }
          }}
        />
      </label>
      <div className="save-slot">
        {failed ? (
          <button
            ref={saveRef}
            type="button"
            className="save-failed"
            aria-haspopup="menu"
            aria-expanded={saveOpen}
            aria-label={saveError ? `Save failed. ${saveError}` : "Save failed"}
            onClick={() => setSaveOpen((value) => !value)}
          >
            Failed
          </button>
        ) : (
          <span className="save-state" aria-live="polite">
            {saveSlotLabel(saveState)}
          </span>
        )}
      </div>
      {failed ? (
        <Overlay open={saveOpen} anchorRef={saveRef} onClose={() => setSaveOpen(false)} pattern="menu" label="Save recovery">
          {saveError ? <p className="menu-note">{saveError}</p> : null}
          {saveState === SAVE_STATE.RECOVERY && onRetrySave ? (
            <MenuItem
              onClick={() => {
                setSaveOpen(false);
                onRetrySave();
              }}
            >
              Retry save
            </MenuItem>
          ) : null}
          {saveState === SAVE_STATE.RECOVERY && onReloadSaved ? (
            <MenuItem
              onClick={() => {
                setSaveOpen(false);
                onReloadSaved();
              }}
            >
              Reload saved
            </MenuItem>
          ) : null}
          <MenuItem
            onClick={() => {
              setSaveOpen(false);
              onBackup();
            }}
          >
            Download backup
          </MenuItem>
        </Overlay>
      ) : null}
      <div className="spacer" />
      <div className="topbar-actions">
        {showHistory ? (
          <>
            <button
              type="button"
              className="text-btn ghost"
              onClick={onUndo}
              disabled={!canUndo}
              aria-label="Undo"
              title={`Undo ${commandShortcut(COMMAND_ID.UNDO)}`}
            >
              Undo
            </button>
            <button
              type="button"
              className="text-btn ghost"
              onClick={onRedo}
              disabled={!canRedo}
              aria-label="Redo"
              title={`Redo ${commandShortcut(COMMAND_ID.REDO)}`}
            >
              Redo
            </button>
          </>
        ) : null}
        {showArrange ? (
          <button
            type="button"
            className="text-btn"
            onClick={onArrange}
            aria-label="Arrange"
            title={`Arrange ${commandShortcut(COMMAND_ID.ARRANGE)}`}
          >
            Arrange
          </button>
        ) : null}
        {showPresent ? (
          <button type="button" className="text-btn ghost" onClick={onPresent} aria-label="Present" title="Present P">
            Present
          </button>
        ) : null}
        <button
          type="button"
          className="text-btn primary"
          onClick={onExport}
          aria-label="Export"
          title={`Export ${commandShortcut(COMMAND_ID.EXPORT)}`}
        >
          Export
        </button>
        <button
          ref={moreRef}
          type="button"
          className="text-btn ghost"
          aria-label="More"
          aria-expanded={moreOpen}
          aria-haspopup="menu"
          title="More"
          onClick={() => setMoreOpen((value) => !value)}
        >
          More
        </button>
        <Overlay open={moreOpen} anchorRef={moreRef} onClose={() => setMoreOpen(false)} pattern="menu" label="More actions">
          {showHistory ? null : (
            <>
              <MenuItem shortcut={commandShortcut(COMMAND_ID.UNDO)} disabled={!canUndo} onClick={() => { onUndo(); setMoreOpen(false); }}>
                Undo
              </MenuItem>
              <MenuItem shortcut={commandShortcut(COMMAND_ID.REDO)} disabled={!canRedo} onClick={() => { onRedo(); setMoreOpen(false); }}>
                Redo
              </MenuItem>
              <MenuSeparator />
            </>
          )}
          {showArrange ? null : (
            <MenuItem shortcut={commandShortcut(COMMAND_ID.ARRANGE)} onClick={() => { onArrange(); setMoreOpen(false); }}>
              Arrange
            </MenuItem>
          )}
          {showPresent ? null : (
            <MenuItem shortcut="P" onClick={() => { onPresent(); setMoreOpen(false); }}>
              Present
            </MenuItem>
          )}
          <MenuItem shortcut="O" onClick={() => { onToggleOutline(); setMoreOpen(false); }}>
            Outline
          </MenuItem>
          <MenuItem shortcut="I" onClick={() => { (onToggleDetails ?? onToggleOutline)(); setMoreOpen(false); }}>
            Details
          </MenuItem>
          <MenuItem onClick={() => { onCommand(); setMoreOpen(false); }}>
            Commands
          </MenuItem>
          <MenuItem shortcut="?" onClick={() => { onHelp(); setMoreOpen(false); }}>
            Help
          </MenuItem>
        </Overlay>
      </div>
    </header>
  );
}
