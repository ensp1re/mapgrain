import { iconShapesFor, ICON_VIEWBOX } from "@mapgrain/scene";

interface KindIconProps {
  kind: string;
  label?: string;
}

export function KindIcon({ kind, label }: KindIconProps) {
  return (
    <svg
      className="kind-icon"
      viewBox={`0 0 ${ICON_VIEWBOX} ${ICON_VIEWBOX}`}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      focusable="false"
    >
      {iconShapesFor(kind).map((shape, index) => {
        if (shape.tag === "path") return <path key={index} d={shape.d} />;
        if (shape.tag === "circle") return <circle key={index} cx={shape.cx} cy={shape.cy} r={shape.r} />;
        if (shape.tag === "ellipse") {
          return <ellipse key={index} cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} />;
        }
        return (
          <rect
            key={index}
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            rx={shape.rx}
          />
        );
      })}
    </svg>
  );
}
