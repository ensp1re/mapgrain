import { chmod, cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import { requireEditorAssets } from "../src/packaging.ts";

const cliRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(cliRoot, "..", "..");
const distFile = join(cliRoot, "dist", "mapgrain.js");
const studioOut = join(cliRoot, "studio");
const editorDist = join(repoRoot, "apps", "editor", "dist");

await mkdir(join(cliRoot, "dist"), { recursive: true });
await mkdir(join(cliRoot, "schema"), { recursive: true });
await mkdir(join(cliRoot, "examples"), { recursive: true });

await esbuild.build({
  absWorkingDir: cliRoot,
  entryPoints: [join(cliRoot, "src", "cli.ts")],
  outfile: distFile,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  banner: { js: "#!/usr/bin/env node\n" },
  external: ["@resvg/resvg-js", "elkjs", "elkjs/lib/elk.bundled.js"],
  logLevel: "warning",
});
await chmod(distFile, 0o755);

await cp(join(repoRoot, "packages", "document", "schema", "document.v1.json"), join(cliRoot, "schema", "document.v1.json"));
await cp(
  join(repoRoot, "tests", "fixtures", "documents", "nested-groups.json"),
  join(cliRoot, "examples", "nested-groups.json"),
);
await cp(join(repoRoot, "LICENSE"), join(cliRoot, "LICENSE"));

await requireEditorAssets(editorDist);
await rm(studioOut, { recursive: true, force: true });
await cp(editorDist, studioOut, { recursive: true });

process.stdout.write(`wrote ${distFile}\n`);
