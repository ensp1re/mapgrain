import { useMemo, useState } from "react";
import { KindIcon } from "../diagram/KindIcon.tsx";
import { shortcutLabel } from "../keyboard/shortcutLabel.ts";
import { kindShort } from "../constants/kind.ts";
import { matchesQuery } from "../outline/search.ts";
import { outlineTree } from "../outline/tree.ts";
import type { FlowNodeDraft } from "../types/flow.ts";
import { Pane } from "../ui/Pane.tsx";

interface OutlineProps {
  nodes: FlowNodeDraft[];
  selectedId: string | null;
  onSelect: (id: string, additive?: boolean) => void;
  onClose?: () => void;
}

export function Outline({ nodes, selectedId, onSelect, onClose }: OutlineProps) {
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
    <Pane as="nav" className="outline" title="Outline" meta={count} ariaLabel="Components" onClose={onClose}>
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
        <div key={entry.node.id} className="outline-item" style={{ paddingLeft: 8 + entry.depth * 12 }}>
          {entry.node.type === "group" ? (
            <button
              type="button"
              className="text-btn"
              aria-label={collapsed.has(entry.node.id) ? "Expand group" : "Collapse group"}
              onClick={() => {
                const next = new Set(collapsed);
                if (next.has(entry.node.id)) next.delete(entry.node.id);
                else next.add(entry.node.id);
                setCollapsed(next);
              }}
            >
              {collapsed.has(entry.node.id) ? "+" : "−"}
            </button>
          ) : null}
          <button
            type="button"
            className={[
              "outline-row",
              entry.node.type === "group" ? "is-group" : "",
              selectedId === entry.node.id ? "is-selected" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={(event) =>
              onSelect(entry.node.id, event.shiftKey || event.metaKey || event.ctrlKey)
            }
          >
            {entry.node.data.kind ? <KindIcon kind={entry.node.data.kind} /> : null}
            <span>{entry.node.data.label}</span>
            {entry.node.data.kind ? (
              <span className="kind">{kindShort(entry.node.data.kind)}</span>
            ) : null}
          </button>
        </div>
      ))}
    </Pane>
  );
}
