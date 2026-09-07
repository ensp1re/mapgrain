import { useEffect, useMemo, useState } from "react";
import { COMMANDS, type CommandId } from "../constants/commands.ts";

interface CommandMenuProps {
  open: boolean;
  onClose: () => void;
  onRun: (id: CommandId) => void;
}

export function CommandMenu({ open, onClose, onRun }: CommandMenuProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const items = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return COMMANDS.filter((item) => item.label.toLowerCase().includes(needle));
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  if (!open) return null;
  const current = items[active];
  return (
    <div className="command-scrim" onClick={onClose}>
      <div
        className="command-menu"
        role="dialog"
        aria-label="Command menu"
        onClick={(event) => event.stopPropagation()}
      >
        <input
          autoFocus
          placeholder="Find component, arrange, export…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") onClose();
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((index) => Math.min(index + 1, Math.max(items.length - 1, 0)));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((index) => Math.max(index - 1, 0));
            }
            if (event.key === "Enter" && current) {
              onRun(current.id);
              onClose();
            }
          }}
        />
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={index === active ? "cmd-item is-active" : "cmd-item"}
            onMouseEnter={() => setActive(index)}
            onClick={() => {
              onRun(item.id);
              onClose();
            }}
          >
            <span>{item.label}</span>
            <kbd>{item.shortcut}</kbd>
          </button>
        ))}
      </div>
    </div>
  );
}
