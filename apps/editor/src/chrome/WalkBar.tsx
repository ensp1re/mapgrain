import { useEffect } from "react";
import type { WalkStep } from "../types/walkthrough.ts";

interface WalkBarProps {
  steps: WalkStep[];
  index: number;
  onStep: (index: number) => void;
  onExit: () => void;
}

/** Reading controls. The walkthrough never edits the document it is reading. */
export function WalkBar({ steps, index, onStep, onExit }: WalkBarProps) {
  const step = steps[index];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        onStep(Math.min(steps.length - 1, index + 1));
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onStep(Math.max(0, index - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, onStep, steps.length]);

  if (!step) return null;
  return (
    <div className="walk-bar" role="group" aria-label="Walkthrough">
      <div className="walk-copy">
        <span className="walk-count">
          {index + 1} / {steps.length}
        </span>
        <span className="walk-name" aria-live="polite">
          {step.name}
          {step.description ? <small> · {step.description}</small> : null}
        </span>
      </div>
      <div className="walk-actions">
        <button
          type="button"
          className="text-btn"
          onClick={() => onStep(index - 1)}
          disabled={index === 0}
          aria-label="Previous step"
        >
          ‹
        </button>
        <button
          type="button"
          className="text-btn"
          onClick={() => onStep(index + 1)}
          disabled={index >= steps.length - 1}
          aria-label="Next step"
        >
          ›
        </button>
        <button type="button" className="text-btn ghost" onClick={onExit}>
          Done
        </button>
      </div>
    </div>
  );
}
