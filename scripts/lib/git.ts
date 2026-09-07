import { execFile as execFileCallback } from "node:child_process";
import { promises as fs } from "node:fs";
import { promisify } from "node:util";
import type { GitFacts } from "../types/records.ts";

const execFile = promisify(execFileCallback);

function gitEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_COMMON_DIR;
  delete env.GIT_INDEX_FILE;
  delete env.GIT_OBJECT_DIRECTORY;
  delete env.GIT_ALTERNATE_OBJECT_DIRECTORIES;
  return env;
}

async function git(root: string, args: string[]): Promise<string> {
  const { stdout } = await execFile("git", ["-C", root, ...args], {
    encoding: "utf8",
    env: gitEnv(),
  });
  return stdout.trim();
}

export async function gitInfo(root: string): Promise<GitFacts> {
  try {
    const toplevel = await git(root, ["rev-parse", "--show-toplevel"]);
    if (await realpathOrNull(toplevel) !== root) {
      return { available: false, branch: null, revision: null, dirty: null };
    }
    const [branch, revision, status] = await Promise.all([
      git(root, ["branch", "--show-current"]),
      git(root, ["rev-parse", "HEAD"]),
      git(root, ["status", "--porcelain"]),
    ]);
    return {
      available: true,
      branch: branch || null,
      revision: revision || null,
      dirty: Boolean(status),
    };
  } catch {
    return { available: false, branch: null, revision: null, dirty: null };
  }
}

async function realpathOrNull(value: string): Promise<string | null> {
  try {
    return await fs.realpath(value);
  } catch {
    return null;
  }
}

export async function runGit(root: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  const { stdout, stderr } = await execFile("git", ["-C", root, ...args], {
    encoding: "utf8",
    env: gitEnv(),
  });
  return { stdout: stdout.trim(), stderr: stderr.trim() };
}
