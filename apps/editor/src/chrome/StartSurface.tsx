import { useRef, useState } from "react";
import type { DocumentKind } from "@mapgrain/document";
import { AGENT_CHOICES, skillInstallCommand } from "../constants/agents.ts";
import { EXAMPLES } from "../create/examples.ts";
import { MODE_CHOICES } from "../create/modes.ts";
import { KindIcon } from "../diagram/KindIcon.tsx";
import { Select } from "../ui/Select.tsx";

interface RecentItem {
  id: string;
  title: string;
  lastOpenedAt?: string;
  updatedAt?: string;
}

interface StartSurfaceProps {
  importError: string | null;
  recents: RecentItem[];
  canReturn?: boolean;
  onBack?: () => void;
  onNewBlank: (kind?: DocumentKind) => void;
  onOpenExample: (id: string) => void;
  onOpenRecent: (id: string) => void;
  onImportFile: (file: File) => void;
}

const MODE_ICON: Record<string, string> = {
  architecture: "gateway",
  workflow: "job",
  sequence: "participant",
  "data-flow": "process",
  lifecycle: "state",
};

function documentKindOf(document: unknown): string {
  if (document && typeof document === "object" && "kind" in document && typeof document.kind === "string") {
    return document.kind;
  }
  return "architecture";
}

function recentStamp(item: RecentItem): string {
  const value = item.lastOpenedAt ?? item.updatedAt;
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

export function StartSurface({
  importError,
  recents,
  canReturn = false,
  onBack,
  onNewBlank,
  onOpenExample,
  onOpenRecent,
  onImportFile,
}: StartSurfaceProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [agentId, setAgentId] = useState<string>(AGENT_CHOICES[0]?.id ?? "cursor");
  const [copied, setCopied] = useState(false);
  const install = `${skillInstallCommand(agentId)}\nnpx mapgrain@0.2.2 validate diagram.json\nnpx mapgrain@0.2.2 layout diagram.json`;

  return (
    <main className="start-page" aria-label="New diagram">
      <div className="start-inner">
        <header className="start-top">
          <div className="brand">Mapgrain</div>
          {canReturn && onBack ? (
            <button type="button" className="text-btn ghost" onClick={onBack}>
              Back to diagram
            </button>
          ) : null}
        </header>
        <h1>New diagram</h1>
        <p className="start-lead">Create a diagram, open a file, or continue from a recent or example.</p>
        <section className="mode-grid" aria-label="Choose a diagram mode">
          <h2>Choose a mode</h2>
          <div className="example-cards">
            {MODE_CHOICES.map((mode) => (
              <button
                key={mode.kind}
                type="button"
                className="example-card"
                onClick={() => onNewBlank(mode.kind)}
              >
                <span className="example-kind">
                  <KindIcon kind={MODE_ICON[mode.kind] ?? "service"} />
                  {mode.title}
                </span>
                <strong>New {mode.title.toLowerCase()}</strong>
                <span>{mode.purpose}</span>
              </button>
            ))}
          </div>
        </section>
        <div className="start-open">
          <button type="button" className="text-btn" onClick={() => fileRef.current?.click()}>
            Open file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            aria-label="Open file"
            tabIndex={-1}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onImportFile(file);
              event.target.value = "";
            }}
          />
          {importError ? (
            <p className="start-failure" role="alert">
              {importError} Use a Mapgrain JSON export.
            </p>
          ) : null}
        </div>
        <section className="recent-list" aria-label="Recent diagrams">
          <h2>Recent diagrams</h2>
          {recents.length === 0 ? (
            <p className="recent-empty">No recent diagrams yet.</p>
          ) : (
            <ul className="recent-rows">
              {recents.map((item) => (
                <li key={item.id}>
                  <button type="button" className="recent-row" onClick={() => onOpenRecent(item.id)}>
                    <span className="recent-name">{item.title}</span>
                    <span className="recent-time">{recentStamp(item)}</span>
                    <span className="recent-action">Open</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section id="examples" className="example-grid" aria-label="Examples">
          <h2>Examples</h2>
          <div className="example-cards">
            {EXAMPLES.map((example) => (
              <button
                key={example.id}
                type="button"
                className="example-card"
                onClick={() => onOpenExample(example.id)}
              >
                <span className="example-kind">
                  <KindIcon kind={MODE_ICON[documentKindOf(example.document)] ?? "service"} />
                  {documentKindOf(example.document).replace("-", " ")}
                </span>
                <strong>{example.title}</strong>
                <span>{example.blurb}</span>
              </button>
            ))}
          </div>
        </section>
        <details className="agent-path">
          <summary>Use with an agent</summary>
          <p>
            Install the Mapgrain skill, ask that agent for diagram JSON, then validate and open the
            file here.
          </p>
          <Select
            label="Agent"
            value={agentId}
            options={AGENT_CHOICES.map((item) => ({ value: item.id, label: item.label }))}
            onChange={setAgentId}
          />
          <pre className="agent-example">{install}</pre>
          <button
            type="button"
            className="text-btn"
            onClick={() => {
              void navigator.clipboard?.writeText(install).then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1200);
              });
            }}
          >
            {copied ? "Copied" : "Copy commands"}
          </button>
        </details>
      </div>
    </main>
  );
}
