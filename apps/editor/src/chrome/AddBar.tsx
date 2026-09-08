import { useEffect, useMemo, useRef, useState } from "react";
import type { NodeKind } from "@mapgrain/document";
import { ADDABLE_KINDS } from "../create/nodes.ts";
import { Button } from "../ui/Button.tsx";

interface AddBarProps {
  onAddNode: (kind: NodeKind) => void;
  onAddGroup: () => void;
  onConnect: () => void;
  canConnect: boolean;
}

const ADD_ITEMS: Array<{ id: string; label: string; kind: NodeKind | "group" }> = [
  ...ADDABLE_KINDS.map((kind) => ({ id: kind, label: kind, kind })),
  { id: "group", label: "group", kind: "group" as const },
];

export function AddBar({ onAddNode, onAddGroup, onConnect, canConnect }: AddBarProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const items = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return ADD_ITEMS.filter((item) => item.label.includes(needle));
  }, [query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function insert(item: (typeof ADD_ITEMS)[number]) {
    if (item.kind === "group") onAddGroup();
    else onAddNode(item.kind);
    setOpen(false);
  }

  const current = items[active];

  return (
    <div className="add-bar" role="toolbar" aria-label="Library">
      <div className="add-menu">
        <Button
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          Add
        </Button>
        {open ? (
          <div className="add-menu-pop" role="listbox" aria-label="Add component">
            <input
              ref={searchRef}
              aria-label="Search kinds"
              placeholder="Search kinds"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActive((index) => Math.min(index + 1, Math.max(items.length - 1, 0)));
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActive((index) => Math.max(index - 1, 0));
                }
                if (event.key === "Enter" && current) {
                  event.preventDefault();
                  insert(current);
                }
              }}
            />
            {items.length === 0 ? <p className="add-empty">No matching kinds.</p> : null}
            {items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={index === active}
                className={index === active ? "text-btn is-on" : "text-btn"}
                onMouseEnter={() => setActive(index)}
                onClick={() => insert(item)}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {canConnect ? (
        <Button onClick={onConnect}>Connect</Button>
      ) : null}
    </div>
  );
}
