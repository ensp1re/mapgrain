import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { documentJsonSchema } from "../src/schema/document.ts";

const schemaDir = fileURLToPath(new URL("../schema", import.meta.url));
await mkdir(schemaDir, { recursive: true });
const file = path.join(schemaDir, "document.v1.json");
await writeFile(file, `${JSON.stringify(documentJsonSchema(), null, 2)}\n`);
process.stdout.write(`${file}\n`);
