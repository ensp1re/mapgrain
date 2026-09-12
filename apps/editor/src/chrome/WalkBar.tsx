import { useEffect } from "react";
import { WALK_SPEEDS } from "../constants/walkthrough.ts";
import type { WalkStep } from "../types/walkthrough.ts";

interface WalkBarProps {
  steps: WalkStep[];
  index: number;
  playing: boolean;
  speed: number;
  onStep: (index: number) => void;
  onPlaying: (playing: boolean) => void;
  onSpeed: (speed: number) => void;
  onExit: () => void;
}

/** Reading controls. The walkthrough never edits the document it is reading. */
export function WalkBar({
  steps,
  index,
  playing,
  speed,
  onStep,
  onPlaying,
  onSpeed,
  onExit,
}: WalkBarProps) {
  const step = steps[index];
  const last = steps.length - 1;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === " ") {
        event.preventDefault();
        onPlaying(!playing);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        onStep(Math.min(last, index + 1));
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onStep(Math.max(0, index - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, last, onStep, onPlaying, playing]);

  if (!step) return null;
  return (
    <div className="walk-bar" role="group" aria-label="Walkthrough">
      <button
        type="button"
        className="text-btn walk-play"
        onClick={() => onPlaying(!playing)}
        aria-label={playing ? "Pause" : "Play"}
        title={playing ? "Pause (Space)" : "Play (Space)"}
      >
        {playing ? "❚❚" : "▶"}
      </button>
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
          disabled={index >= last}
          aria-label="Next step"
        >
          ›
        </button>
        <button
          type="button"
          className="text-btn walk-speed"
          onClick={() => onSpeed(WALK_SPEEDS[(WALK_SPEEDS.indexOf(speed) + 1) % WALK_SPEEDS.length] ?? 1)}
          aria-label={`Speed ${speed}×`}
          title="Playback speed"
        >
          {speed}×
        </button>
        <button type="button" className="text-btn ghost" onClick={onExit}>
          Done
        </button>
      </div>
    </div>
  );
}
