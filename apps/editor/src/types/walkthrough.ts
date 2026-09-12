export interface WalkStep {
  /** Node brought into focus for this step. */
  nodeId: string;
  /** Edge traversed to reach it, if this step follows one. */
  edgeId: string | null;
  name: string;
  description?: string;
}
