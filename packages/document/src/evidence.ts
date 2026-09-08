export function snapshotMatches(expected: string | undefined, digest: string | null): boolean | null {
  if (!expected) return null;
  if (!digest) return false;
  return expected === digest;
}
