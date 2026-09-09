import { kindDisplayText } from "@mapgrain/scene";
import { KindIcon } from "./KindIcon.tsx";

interface KindLabelProps {
  kind: string;
  label?: string;
}

export function KindLabel({ kind, label }: KindLabelProps) {
  return (
    <div className="node-head">
      <KindIcon kind={kind} />
      <div className="node-kind">{label ?? kindDisplayText(kind)}</div>
    </div>
  );
}
