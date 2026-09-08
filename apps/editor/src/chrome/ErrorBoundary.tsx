import { Component, type ErrorInfo, type ReactNode } from "react";
import { backupBytes } from "../persist/codec.ts";
import type { EditorSnapshot } from "../types/editor.ts";

interface ErrorBoundaryProps {
  snapshot: EditorSnapshot | null;
  onReturnToLibrary: () => void;
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

function downloadRecovery(snapshot: EditorSnapshot): void {
  const bytes = backupBytes(snapshot);
  const blob = new Blob([Uint8Array.from(bytes)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "recovery.json";
  link.click();
  URL.revokeObjectURL(url);
}

export class EditorErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = { error: null };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  public override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("editor crashed", error, info.componentStack);
  }

  public override render(): ReactNode {
    if (!this.state.error) return this.props.children;
    const snapshot = this.props.snapshot;
    return (
      <main className="error-recovery" aria-label="Editor recovery">
        <h1>The editor hit a problem</h1>
        <p>Your saved diagrams are still on this device. Nothing was erased to recover.</p>
        <div className="start-actions">
          <button
            type="button"
            className="text-btn primary"
            onClick={() => {
              this.setState({ error: null });
              this.props.onReturnToLibrary();
            }}
          >
            Return to library
          </button>
          {snapshot ? (
            <button type="button" className="text-btn" onClick={() => downloadRecovery(snapshot)}>
              Download recovery file
            </button>
          ) : null}
        </div>
      </main>
    );
  }
}
