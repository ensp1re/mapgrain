import { PINNED_GIT_REVISION } from "./constants/document.ts";

export function snapshotMatches(expected: string | undefined, digest: string | null): boolean | null {
  if (!expected) return null;
  if (!digest) return false;
  return expected === digest;
}

export function isPinnedGitRevision(revision: string | undefined): revision is string {
  return Boolean(revision && PINNED_GIT_REVISION.test(revision));
}

export function gitVerified(input: {
  revision: string | undefined;
  snapshot: string | undefined;
  gitObjectDigest: string | null;
}): boolean {
  if (!isPinnedGitRevision(input.revision)) return false;
  if (!input.snapshot || !input.gitObjectDigest) return false;
  return input.snapshot === input.gitObjectDigest;
}
