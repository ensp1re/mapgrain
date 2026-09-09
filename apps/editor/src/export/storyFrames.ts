import type { DiagramDocument } from "@mapgrain/document";

export function storyExportFrames(document: DiagramDocument): Array<{ id: string; nodeIds?: string[] }> {
  const story = document.stories?.[0];
  if (!story) return [];
  return story.steps.map((step) => {
    const view = step.viewId ? document.views.find((item) => item.id === step.viewId) : undefined;
    return {
      id: step.id,
      nodeIds: step.nodeId ? [step.nodeId] : view?.nodeIds,
    };
  });
}
