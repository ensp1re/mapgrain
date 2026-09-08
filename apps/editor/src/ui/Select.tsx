import { useEffect, useId, useRef, useState } from "react";

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
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = options.find((option) => option.value === value)?.label ?? value;

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="ui-select" ref={root}>
      <button
        type="button"
        className="ui-select-trigger"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
      >
        {current}
      </button>
      {open ? (
        <ul className="ui-select-list" id={listId} role="listbox">
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
      ) : null}
    </div>
  );
}
