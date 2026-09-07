import { JOB_STAGE, JOB_STATUS, REPAIR_ACTION } from "../constants/create.ts";
import { EXAMPLES } from "../create/examples.ts";
import type { CreateJobResult, JobStage } from "../types/create.ts";

interface StartSurfaceProps {
  prompt: string;
  job: CreateJobResult | { status: typeof JOB_STATUS.IDLE | typeof JOB_STATUS.RUNNING; stage?: JobStage };
  importError: string | null;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onRepair: () => void;
  onOpenExample: (id: string) => void;
  onImportFile: (file: File) => void;
}

const STAGES = [JOB_STAGE.INTERPRETING, JOB_STAGE.ARRANGING, JOB_STAGE.CHECKING];

export function StartSurface({
  prompt,
  job,
  importError,
  onPromptChange,
  onSubmit,
  onCancel,
  onRepair,
  onOpenExample,
  onImportFile,
}: StartSurfaceProps) {
  const running = job.status === JOB_STATUS.RUNNING;
  return (
    <main className="start-surface" aria-label="New diagram">
      <header className="start-header">
        <div className="brand">Mapgrain</div>
        <p>Start from an example or import a document. Generation stays off until a provider is configured.</p>
      </header>
      <form
        className="start-prompt"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label>
          Describe a diagram
          <textarea
            aria-label="Describe a diagram"
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            rows={4}
          />
        </label>
        <div className="start-actions">
          <button type="submit" className="text-btn primary" disabled={running || prompt.trim() === ""}>
            Submit
          </button>
          {running ? (
            <button type="button" className="text-btn" onClick={onCancel}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>
      <ol className="job-stages" aria-label="Generation stages">
        {STAGES.map((stage) => (
          <li key={stage} className={job.stage === stage ? "is-current" : ""}>
            {stage}
          </li>
        ))}
      </ol>
      {job.status === JOB_STATUS.FAILED ? (
        <div className="start-failure" role="alert">
          <p>{job.message}</p>
          {job.repair === REPAIR_ACTION.OPEN_EXAMPLE ? (
            <button type="button" className="text-btn" onClick={onRepair}>
              Open an example
            </button>
          ) : null}
        </div>
      ) : null}
      {job.status === JOB_STATUS.CANCELLED ? (
        <p className="start-note" role="status">
          Cancelled. Your text is still here.
        </p>
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
      <label className="import-field">
        Import JSON
        <input
          type="file"
          accept="application/json,.json"
          aria-label="Import JSON"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onImportFile(file);
            event.target.value = "";
          }}
        />
      </label>
      {importError ? (
        <p className="start-failure" role="alert">
          {importError}
        </p>
      ) : null}
    </main>
  );
}
