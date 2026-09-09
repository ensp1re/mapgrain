import { useEffect, useMemo, useRef, useState } from "react";
import type { NodeKind } from "@mapgrain/document";
import { Button } from "../ui/Button.tsx";
import { useFocusTrap } from "./focusTrap.ts";

interface AddBarProps {
  kinds: NodeKind[];
  groupLabel?: string;
  onAddNode: (kind: NodeKind) => void;
  onAddGroup: () => void;
  onConnect: () => void;
  canConnect: boolean;
}

export function AddBar({
  kinds,
  groupLabel = "group",
  onAddNode,
  onAddGroup,
  onConnect,
  canConnect,
}: AddBarProps) {
  const addItems: Array<{ id: string; label: string; kind: NodeKind | "group" }> = [
    ...kinds.map((kind) => ({ id: kind, label: kind, kind })),
    { id: "group", label: groupLabel, kind: "group" as const },
  ];
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  useFocusTrap(popRef, open, () => setOpen(false));
  const items = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return addItems.filter((item) => item.label.includes(needle));
  }, [addItems, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    searchRef.current?.focus();
  }, [open]);

  function insert(item: (typeof addItems)[number]) {
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
          aria-label="Add"
        >
          Add component
        </Button>
        {open ? (
          <div ref={popRef} className="add-menu-pop" role="listbox" aria-label="Add component">
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
