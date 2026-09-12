import { useMemo, useState } from "react";
import type { Theme } from "@mapgrain/document";
import {
  TEMPLATE_CATEGORY_BLURB,
  TEMPLATE_CATEGORY_LABEL,
  type TemplateCategory,
} from "../constants/templates.ts";
import { matchesTemplate, templatesByCategory, TEMPLATES } from "../templates/catalog.ts";
import type { TemplateSpec } from "../types/templates.ts";
import { TemplatePreview } from "./TemplatePreview.tsx";

interface TemplateGalleryProps {
  theme: Theme;
  onUse: (id: string) => void;
  templates?: TemplateSpec[];
}

export function TemplateGallery({ theme, onUse, templates = TEMPLATES }: TemplateGalleryProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<TemplateCategory | "all">("all");
  const groups = useMemo(() => templatesByCategory(templates), [templates]);

  const visible = useMemo(
    () =>
      groups
        .filter((group) => category === "all" || group.category === category)
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => matchesTemplate(item, query)),
        }))
        .filter((group) => group.items.length > 0),
    [groups, category, query],
  );
  const count = visible.reduce((total, group) => total + group.items.length, 0);

  return (
    <section className="template-gallery" aria-label="Templates">
      <div className="template-head">
        <h2>Start from a template</h2>
        <label className="outline-search template-search">
          <span className="visually-hidden">Search templates</span>
          <input
            type="search"
            value={query}
            placeholder="Search templates"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>
      <div className="template-rail" role="tablist" aria-label="Template categories">
        <button
          type="button"
          role="tab"
          aria-selected={category === "all"}
          className={`template-tab${category === "all" ? " is-on" : ""}`}
          onClick={() => setCategory("all")}
        >
          All
        </button>
        {groups.map((group) => (
          <button
            key={group.category}
            type="button"
            role="tab"
            aria-selected={category === group.category}
            className={`template-tab${category === group.category ? " is-on" : ""}`}
            onClick={() => setCategory(group.category)}
          >
            {TEMPLATE_CATEGORY_LABEL[group.category]}
          </button>
        ))}
      </div>
      {count === 0 ? (
        <p className="template-empty">No template matches “{query}”. Try a diagram type, or start blank.</p>
      ) : null}
      {visible.map((group) => (
        <div key={group.category} className="template-group">
          <h3>{TEMPLATE_CATEGORY_LABEL[group.category]}</h3>
          <p className="template-group-blurb">{TEMPLATE_CATEGORY_BLURB[group.category]}</p>
          <ul className="template-cards">
            {group.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="template-card"
                  onClick={() => onUse(item.id)}
                  aria-label={`Use template ${item.title}`}
                >
                  <TemplatePreview spec={item} theme={theme} />
                  <strong>{item.title}</strong>
                  <span>{item.blurb}</span>
                  <span className="template-meta">
                    {item.document.nodes.length} components · {item.document.edges.length} connections
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
