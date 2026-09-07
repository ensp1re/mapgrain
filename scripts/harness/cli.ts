#!/usr/bin/env node

import { HarnessError } from "./lib/error.ts";
import { realRoot } from "./lib/fs.ts";
import { commandArchive } from "./commands/archive.ts";
import { commandContext } from "./commands/context.ts";
import { commandDeliver } from "./commands/deliver.ts";
import { commandHandoff } from "./commands/handoff.ts";
import { commandTasks } from "./commands/tasks.ts";
import { commandTransition } from "./commands/transition.ts";
import { commandValidate } from "./commands/validate.ts";
import { commandVerify } from "./commands/verify.ts";
import type { CommandResult } from "./types/records.ts";

const COMMANDS = new Set([
  "context",
  "tasks",
  "validate",
  "verify",
  "handoff",
  "archive",
  "deliver",
  "transition",
]);

function parseCli(argv: string[]): { root: string; command: string; rest: string[] } {
  if (argv[0] !== "--root" || !argv[1] || !argv[2]) {
    throw new HarnessError("usage: harness --root PATH COMMAND [arguments]");
  }
  return { root: argv[1], command: argv[2], rest: argv.slice(3) };
}

async function dispatch(root: string, command: string, rest: string[]): Promise<CommandResult> {
  switch (command) {
    case "context":
      return commandContext(root);
    case "tasks":
      return commandTasks(root);
    case "validate":
      return commandValidate(root);
    case "verify":
      return commandVerify(root, rest);
    case "handoff":
      return commandHandoff(root);
    case "archive":
      return commandArchive(root, rest);
    case "deliver":
      return commandDeliver(root, rest);
    case "transition":
      return commandTransition(root, rest);
    default:
      throw new HarnessError(`unsupported command: ${command}`);
  }
}

async function main(): Promise<void> {
  try {
    const { root: requestedRoot, command, rest } = parseCli(process.argv.slice(2));
    if (!COMMANDS.has(command)) throw new HarnessError(`unsupported command: ${command}`);
    const root = await realRoot(requestedRoot);
    const result = await dispatch(root, command, rest);
    process.stdout.write(`${JSON.stringify(result.payload)}\n`);
    process.exitCode = result.exitCode;
  } catch (error) {
    if (error instanceof HarnessError) {
      process.stdout.write(
        `${JSON.stringify({
          ok: false,
          error: error.message,
          errors: Array.isArray(error.details) ? error.details : [error.message],
          details: error.details ?? null,
        })}\n`,
      );
      process.exitCode = error.exitCode;
      return;
    }
    process.stdout.write(
      `${JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        errors: [error instanceof Error ? error.message : String(error)],
      })}\n`,
    );
    process.exitCode = 2;
  }
}

await main();
