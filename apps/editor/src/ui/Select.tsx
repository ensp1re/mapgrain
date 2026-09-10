import { useId, useRef, useState, type ReactNode } from "react";
import { Overlay } from "./Overlay.tsx";

export interface SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface SelectProps {
  label: string;
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
}

export function Select({ label, value, options, onChange }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(value);
  const trigger = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const current = options.find((option) => option.value === value);
  const currentLabel = current?.label ?? value;

  const commit = (next: string) => {
    onChange(next);
    setOpen(false);
    trigger.current?.focus();
  };

  const close = () => {
    setHighlight(value);
    setOpen(false);
  };

  return (
    <div className="ui-select">
      <button
        ref={trigger}
        type="button"
        className="ui-select-trigger"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          setHighlight(value);
          setOpen((currentOpen) => !currentOpen);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setHighlight(value);
            setOpen(true);
          }
        }}
      >
        {current?.icon ? <span className="select-icon">{current.icon}</span> : null}
        {currentLabel}
      </button>
      <Overlay
        open={open}
        anchorRef={trigger}
        onClose={close}
        align="start"
        pattern="listbox"
        matchAnchorWidth
        label={label}
      >
        <ul className="menu-list" id={listId} role="presentation">
          {options.map((option) => (
            <li key={option.value} role="none">
              <button
                type="button"
                role="option"
                aria-selected={option.value === highlight}
                className={
                  option.value === highlight ? "menu-item is-active" : "menu-item"
                }
                onFocus={() => setHighlight(option.value)}
                onMouseEnter={() => setHighlight(option.value)}
                onClick={() => commit(option.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    commit(highlight);
                  }
                  if (event.key === "Home") {
                    event.preventDefault();
                    const first = options[0];
                    if (first) setHighlight(first.value);
                  }
                  if (event.key === "End") {
                    event.preventDefault();
                    const last = options[options.length - 1];
                    if (last) setHighlight(last.value);
                  }
                  if (event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
                    const needle = event.key.toLowerCase();
                    const start = options.findIndex((item) => item.value === highlight) + 1;
                    const ordered = options.slice(start).concat(options.slice(0, start));
                    const match = ordered.find((item) => item.label.toLowerCase().startsWith(needle));
                    if (match) setHighlight(match.value);
                  }
                }}
              >
                <span className="menu-icon" aria-hidden="true">
                  {option.icon}
                </span>
                <span className="menu-label">{option.label}</span>
                <span className="menu-extra">{option.value === value ? "✓" : ""}</span>
              </button>
            </li>
          ))}
        </ul>
      </Overlay>
    </div>
  );
}
