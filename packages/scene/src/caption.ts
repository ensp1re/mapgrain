/**
 * What a connection says on the canvas.
 *
 * The edge type used to lead every caption, so a lifecycle read `transition · token valid`
 * and a workflow read `calls · green`. The type is constant per document kind and the line
 * itself carries it, so it only widened the label and crowded the diagram. An edge with
 * nothing but a type now draws no caption at all.
 */
export function edgeCaption(_type: string, label?: string, extra?: string): string {
  return [extra, label].filter((part) => Boolean(part)).join(" · ");
}
