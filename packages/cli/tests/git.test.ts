import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { isolatedGitEnv, readGitBlob } from "../src/git.ts";

test("readGitBlob returns the committed file and ignores a later working-tree edit", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mapgrain-git-"));
  const env = isolatedGitEnv();
  const git = (args: string[]) => spawnSync("git", args, { cwd: dir, env, encoding: "utf8" });
  const init = git(["init", "-b", "main"]);
  assert.equal(init.status, 0, init.stderr);
  await mkdir(join(dir, "src"), { recursive: true });
  await writeFile(join(dir, "src/a.ts"), "one\n");
  git(["add", "src/a.ts"]);
  const commit = git([
    "-c",
    "user.name=fixture",
    "-c",
    "user.email=fixture@example.test",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-m",
    "a",
  ]);
  assert.equal(commit.status, 0, commit.stderr);
  const sha = git(["rev-parse", "HEAD"]).stdout.trim();
  await writeFile(join(dir, "src/a.ts"), "two\n");
  assert.equal(readGitBlob(sha, "src/a.ts", dir), "one\n");
  assert.equal(readGitBlob("main", "src/a.ts", dir), null);
});
