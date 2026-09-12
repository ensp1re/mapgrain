import type { ValidationIssue } from "@mapgrain/document";
import type { EditorSnapshot } from "../types/editor.ts";

interface LoadFailureProps {
  issues: ValidationIssue[];
  snapshot: EditorSnapshot | null;
  onReturnToLibrary: () => void;
  onDownload: () => void;
}

export function LoadFailure({ issues, snapshot, onReturnToLibrary, onDownload }: LoadFailureProps) {
  const first = issues[0];
  const rest = issues.length - 1;
  return (
    <main className="error-recovery" role="alert" aria-label="Diagram could not be opened">
      <h1>This diagram could not be opened</h1>
      <p>{first?.message ?? "The diagram is missing or could not be read."}</p>
      {first?.path ? (
        <p className="failure-detail">
          <code>{first.path}</code>
          {first.elementId ? ` · ${first.elementId}` : ""}
        </p>
      ) : null}
      {rest > 0 ? (
        <p className="failure-detail">
          {rest} more problem{rest > 1 ? "s" : ""} in this document.
        </p>
      ) : null}
      <div className="start-actions">
        <button type="button" className="text-btn primary" onClick={onReturnToLibrary}>
          Return to library
        </button>
        {snapshot ? (
          <button type="button" className="text-btn" onClick={onDownload}>
            Download this diagram
          </button>
        ) : null}
      </div>
    </main>
  );
}
