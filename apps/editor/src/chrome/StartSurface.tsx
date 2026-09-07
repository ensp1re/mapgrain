import { EXAMPLES } from "../create/examples.ts";

interface RecentItem {
  id: string;
  title: string;
}

interface StartSurfaceProps {
  importError: string | null;
  recents: RecentItem[];
  onNewBlank: () => void;
  onOpenExample: (id: string) => void;
  onOpenRecent: (id: string) => void;
  onImportFile: (file: File) => void;
}

export function StartSurface({
  importError,
  recents,
  onNewBlank,
  onOpenExample,
  onOpenRecent,
  onImportFile,
}: StartSurfaceProps) {
  return (
    <main className="start-surface" aria-label="New diagram">
      <header className="start-header">
        <div className="brand">Mapgrain</div>
        <p>Create a diagram by hand, open a file, or start from an example.</p>
      </header>
      <div className="start-actions">
        <button type="button" className="text-btn primary" onClick={onNewBlank}>
          New blank diagram
        </button>
        <label className="text-btn">
          Open file
          <input
            type="file"
            accept="application/json,.json"
            aria-label="Open file"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onImportFile(file);
              event.target.value = "";
            }}
          />
        </label>
      </div>
      <section className="agent-path" aria-label="Use with your agent">
        <h2>Use with your agent</h2>
        <p>
          Install the Mapgrain skill, ask your agent for a diagram JSON, then validate and open it
          here.
        </p>
        <pre className="agent-example">{`npx skills add ensp1re/mapgrain --skill mapgrain --yes
Create a Mapgrain architecture JSON with Browser, API, and Database nodes.
npx mapgrain@0.1.0 validate diagram.json`}</pre>
      </section>
      {recents.length > 0 ? (
        <section className="recent-list" aria-label="Recent diagrams">
          <h2>Recent diagrams</h2>
          <ul>
            {recents.map((item) => (
              <li key={item.id}>
                <button type="button" className="text-btn" onClick={() => onOpenRecent(item.id)}>
                  {item.title}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
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
              <span className="example-kind">Example</span>
              <strong>{example.title}</strong>
              <span>{example.blurb}</span>
            </button>
          ))}
        </div>
      </section>
      {importError ? (
        <p className="start-failure" role="alert">
          {importError}
        </p>
      ) : null}
    </main>
  );
}
