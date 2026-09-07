import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function packageRoot(metaUrl = import.meta.url): string {
  const here = dirname(fileURLToPath(metaUrl));
  const leaf = here.split(/[/\\]/).at(-1);
  if (leaf === "src" || leaf === "dist") return join(here, "..");
  return here;
}

export function schemaFile(root = packageRoot()): string {
  return join(root, "schema", "document.v1.json");
}

export function exampleFile(root = packageRoot()): string {
  return join(root, "examples", "nested-groups.json");
}

export function studioDir(root = packageRoot()): string {
  return join(root, "studio");
}

export function studioFixtureDir(root = packageRoot()): string {
  return join(root, "fixtures", "studio");
}

export function packageManifest(root = packageRoot()): string {
  return join(root, "package.json");
}
