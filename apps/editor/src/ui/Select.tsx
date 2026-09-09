import { useId, useRef, useState } from "react";
import { Overlay } from "./Overlay.tsx";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label: string;
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
}

export function Select({ label, value, options, onChange }: SelectProps) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const current = options.find((option) => option.value === value)?.label ?? value;
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  const move = (delta: number) => {
    if (options.length === 0) return;
    const next = (selectedIndex + delta + options.length) % options.length;
    const option = options[next];
    if (option) onChange(option.value);
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
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            return;
          }
          if (event.key === "Home") {
            event.preventDefault();
            const first = options[0];
            if (first) onChange(first.value);
            return;
          }
          if (event.key === "End") {
            event.preventDefault();
            const last = options[options.length - 1];
            if (last) onChange(last.value);
            return;
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            if (!open) setOpen(true);
            else move(1);
            return;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            if (!open) setOpen(true);
            else move(-1);
            return;
          }
          if (event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
            const needle = event.key.toLowerCase();
            const start = selectedIndex + 1;
            const ordered = options.slice(start).concat(options.slice(0, start));
            const match = ordered.find((option) => option.label.toLowerCase().startsWith(needle));
            if (match) onChange(match.value);
          }
        }}
      >
        {current}
      </button>
      <Overlay
        open={open}
        anchorRef={trigger}
        onClose={() => setOpen(false)}
        align="start"
        role="listbox"
        label={label}
      >
        <ul className="ui-select-list is-overlay" id={listId} role="presentation">
          {options.map((option) => (
            <li key={option.value} role="none">
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={option.value === value ? "ui-select-option is-selected" : "ui-select-option"}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      </Overlay>
    </div>
  );
}
