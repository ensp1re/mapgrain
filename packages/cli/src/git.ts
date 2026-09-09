import { spawnSync } from "node:child_process";
import { isPinnedGitRevision } from "@mapgrain/document";

export function isolatedGitEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_COMMON_DIR;
  delete env.GIT_INDEX_FILE;
  delete env.GIT_OBJECT_DIRECTORY;
  delete env.GIT_ALTERNATE_OBJECT_DIRECTORIES;
  return env;
}

export function readGitBlob(revision: string, path: string, cwd = process.cwd()): string | null {
  if (!isPinnedGitRevision(revision)) return null;
  const env = isolatedGitEnv();
  const type = spawnSync("git", ["cat-file", "-t", revision], {
    cwd,
    env,
    encoding: "utf8",
    timeout: 5000,
  });
  if (type.status !== 0 || type.stdout.trim() !== "commit") return null;
  const blob = spawnSync("git", ["cat-file", "-p", `${revision}:${path}`], {
    cwd,
    env,
    encoding: "buffer",
    timeout: 5000,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (blob.status !== 0 || blob.stdout == null) return null;
  return Buffer.from(blob.stdout).toString("utf8");
}
