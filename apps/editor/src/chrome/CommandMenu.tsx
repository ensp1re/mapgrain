import { useEffect, useMemo, useRef, useState } from "react";
import { COMMANDS, type CommandId } from "../constants/commands.ts";
import type { FlowNodeDraft } from "../types/flow.ts";
import { useFocusTrap } from "./focusTrap.ts";

interface CommandMenuProps {
  open: boolean;
  nodes: FlowNodeDraft[];
  onClose: () => void;
  onRun: (id: CommandId) => void;
  onFocusNode: (id: string) => void;
}

export function CommandMenu({ open, nodes, onClose, onRun, onFocusNode }: CommandMenuProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open, onClose);
  const items = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const commands = COMMANDS.filter((item) => item.label.toLowerCase().includes(needle)).map(
      (item) => ({ kind: "command" as const, id: item.id, label: item.label, shortcut: item.shortcut }),
    );
    const components = nodes
      .filter((node) => {
        if (!needle) return false;
        const hay = `${node.data.label} ${node.data.kind ?? ""} ${node.data.kindLabel ?? ""}`.toLowerCase();
        return hay.includes(needle);
      })
      .map((node) => ({
        kind: "node" as const,
        id: node.id,
        label: node.data.label,
        shortcut: node.data.kindLabel ?? node.data.kind ?? "",
      }));
    return [...components, ...commands];
  }, [nodes, query]);

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
        ref={dialogRef}
        className="command-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Command menu"
        onClick={(event) => event.stopPropagation()}
      >
        <input
          autoFocus
          placeholder="Find component or command"
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
              if (current.kind === "node") onFocusNode(current.id);
              else onRun(current.id);
              onClose();
            }
          }}
        />
        {items.length === 0 ? <p className="cmd-empty">No matching components or commands.</p> : null}
        {items.map((item, index) => (
          <button
            key={`${item.kind}:${item.id}`}
            type="button"
            className={index === active ? "cmd-item is-active" : "cmd-item"}
            onMouseEnter={() => setActive(index)}
            onClick={() => {
              if (item.kind === "node") onFocusNode(item.id);
              else onRun(item.id);
              onClose();
            }}
          >
            <span>{item.kind === "node" ? item.label : item.label}</span>
            {item.shortcut ? <kbd>{item.shortcut}</kbd> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
