import { useMemo, useState } from "react";
import { KindIcon } from "../diagram/KindIcon.tsx";
import { shortcutLabel } from "../keyboard/shortcutLabel.ts";

import { matchesQuery } from "../outline/search.ts";
import { outlineTree } from "../outline/tree.ts";
import type { FlowNodeDraft } from "../types/flow.ts";
import { Pane } from "../ui/Pane.tsx";
import { PaneResizer } from "../ui/PaneResizer.tsx";
import { PANE_WIDTH } from "../constants/layout.ts";

/** Open eye, or struck through when the item is hidden. */
function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="eye-icon" aria-hidden="true">
      <path
        d="M1.5 8s2.4-4 6.5-4 6.5 4 6.5 4-2.4 4-6.5 4S1.5 8 1.5 8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <circle cx="8" cy="8" r="1.8" fill="none" stroke="currentColor" strokeWidth="1.3" />
      {off ? <path d="M3 13 13 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /> : null}
    </svg>
  );
}

interface OutlineProps {
  nodes: FlowNodeDraft[];
  selectedId: string | null;
  hiddenIds?: readonly string[];
  onSelect: (id: string, additive?: boolean) => void;
  onToggleHidden?: (id: string) => void;
  onClose?: () => void;
}

export function Outline({
  nodes,
  selectedId,
  hiddenIds = [],
  onSelect,
  onToggleHidden,
  onClose,
}: OutlineProps) {
  const hidden = useMemo(() => new Set(hiddenIds), [hiddenIds]);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const count = nodes.filter((node) => node.type !== "group").length;
  const rows = useMemo(() => {
    const tree = outlineTree(nodes);
    const visibleParents = new Set<string>();
    return tree.filter((entry) => {
      if (entry.node.parentId && collapsed.has(entry.node.parentId)) return false;
      if (!matchesQuery(entry.node, query)) return false;
      if (entry.node.parentId) visibleParents.add(entry.node.parentId);
      return true;
    });
  }, [collapsed, nodes, query]);

  return (
    <Pane
      as="nav"
      className="outline"
      title="Outline"
      meta={count}
      ariaLabel="Components"
      onClose={onClose}
      edge={
        <PaneResizer
          property="--outline-w"
          edge="right"
          label="Resize outline"
          defaultWidth={PANE_WIDTH.OUTLINE}
        />
      }
    >
      <label className="outline-search">
        <span className="visually-hidden">Search components</span>
        <input
          aria-label="Search components"
          placeholder="Search components"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <kbd>{shortcutLabel("⌘K")}</kbd>
      </label>
      {rows.map((entry) => (
        <div
          key={entry.node.id}
          className="outline-item"
          style={{ paddingLeft: 8 + entry.depth * 16 }}
        >
          {entry.node.type === "group" ? (
            <button
              type="button"
              className="outline-chevron"
              aria-label={collapsed.has(entry.node.id) ? "Expand group" : "Collapse group"}
              onClick={() => {
                const next = new Set(collapsed);
                if (next.has(entry.node.id)) next.delete(entry.node.id);
                else next.add(entry.node.id);
                setCollapsed(next);
              }}
            >
              {collapsed.has(entry.node.id) ? "▸" : "▾"}
            </button>
          ) : (
            <span className="outline-chevron" />
          )}
          <button
            type="button"
            className={[
              "outline-row",
              entry.node.type === "group" ? "is-group" : "",
              selectedId === entry.node.id ? "is-selected" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            title={entry.node.data.label}
            onClick={(event) =>
              onSelect(entry.node.id, event.shiftKey || event.metaKey || event.ctrlKey)
            }
          >
            {entry.node.data.kind ? <KindIcon kind={entry.node.data.kind} /> : null}
            <span className="outline-label">{entry.node.data.label}</span>
          </button>
          {onToggleHidden ? (
            <button
              type="button"
              className={`outline-eye${hidden.has(entry.node.id) ? " is-hidden" : ""}`}
              aria-pressed={hidden.has(entry.node.id)}
              aria-label={`${hidden.has(entry.node.id) ? "Show" : "Hide"} ${entry.node.data.label}`}
              title={hidden.has(entry.node.id) ? "Show on the canvas" : "Hide from the canvas"}
              onClick={() => onToggleHidden(entry.node.id)}
            >
              <EyeIcon off={hidden.has(entry.node.id)} />
            </button>
          ) : null}
        </div>
      ))}
    </Pane>
  );
}
