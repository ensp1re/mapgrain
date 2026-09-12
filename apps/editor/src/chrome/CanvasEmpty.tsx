import { shortcutLabel } from "../keyboard/shortcutLabel.ts";

interface CanvasEmptyProps {
  kindLabel: string;
  onAdd: () => void;
}

const GESTURES: Array<{ keys: string; text: string }> = [
  { keys: "Double-click", text: "rename a component" },
  { keys: "Drag a dot", text: "connect two components" },
  { keys: "A", text: "arrange the diagram" },
];

/** A blank canvas used to be a dotted void with one button and no hint of the gestures. */
export function CanvasEmpty({ kindLabel, onAdd }: CanvasEmptyProps) {
  return (
    <div className="canvas-empty">
      <p className="canvas-empty-lead">This {kindLabel} diagram is empty.</p>
      <button type="button" className="text-btn primary" onClick={onAdd}>
        Add your first component
      </button>
      <dl className="canvas-empty-hints">
        {GESTURES.map((gesture) => (
          <div key={gesture.text}>
            <dt>{gesture.keys}</dt>
            <dd>{gesture.text}</dd>
          </div>
        ))}
        <div>
          <dt>{shortcutLabel("⌘K")}</dt>
          <dd>every command</dd>
        </div>
      </dl>
    </div>
  );
}
