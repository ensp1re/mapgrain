interface KindLabelProps {
  kind: string;
}

export function KindLabel({ kind }: KindLabelProps) {
  return <div className="node-kind">{kind}</div>;
}
