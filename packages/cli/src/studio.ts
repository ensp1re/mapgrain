import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { access, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { validateDocument } from "@mapgrain/document";
import { extname, join, normalize, relative, resolve, sep } from "node:path";
import {
  DIAGNOSTIC_CODE,
  EXIT_CODE,
  MAX_INPUT_BYTES,
  STUDIO_COOKIE,
  STUDIO_HEADER,
  STUDIO_IF_MATCH,
  STUDIO_HOST,
  STUDIO_PORT,
  STUDIO_PORT_TRIES,
} from "./constants/cli.ts";
import { studioDir, studioFixtureDir } from "./paths.ts";
import { fail, uniqueSiblingTemp } from "./read.ts";
import type { CliIo } from "./types/cli.ts";

export interface StudioDisk {
  readFile: typeof readFile;
  writeFile: typeof writeFile;
  rename: typeof rename;
  unlink: typeof unlink;
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

export interface StudioServer {
  url: string;
  port: number;
  token: string;
  close: () => Promise<void>;
}

function header(req: IncomingMessage, name: string): string {
  const value = req.headers[name];
  return typeof value === "string" ? value : Array.isArray(value) ? (value[0] ?? "") : "";
}

function cookieValue(req: IncomingMessage, name: string): string | null {
  const raw = header(req, "cookie");
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

function sessionOf(req: IncomingMessage, token: string): boolean {
  const fromHeader = header(req, STUDIO_HEADER);
  const fromCookie = cookieValue(req, STUDIO_COOKIE);
  const fromQuery = new URL(req.url ?? "/", "http://127.0.0.1").searchParams.get("session");
  return fromHeader === token || fromCookie === token || fromQuery === token;
}

function originOk(req: IncomingMessage, port: number): boolean {
  const origin = header(req, "origin");
  if (!origin) return true;
  return origin === `http://${STUDIO_HOST}:${port}`;
}

function hostOk(req: IncomingMessage, port: number): boolean {
  const host = header(req, "host");
  return host === `${STUDIO_HOST}:${port}` || host === STUDIO_HOST;
}

function safeFile(root: string, urlPath: string): string | null {
  const clean = decodeURIComponent(urlPath.split("?")[0] ?? "").replaceAll("\0", "");
  const relativePath = clean === "/" || clean === "" ? "index.html" : clean.replace(/^\/+/, "");
  const resolved = resolve(root, relativePath);
  const rel = relative(resolve(root), resolved);
  if (rel.startsWith("..") || rel.startsWith(`..${sep}`) || normalize(rel).startsWith("..")) return null;
  return resolved;
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buf.byteLength;
    if (size > MAX_INPUT_BYTES) throw new Error("body too large");
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
}

function send(res: ServerResponse, status: number, body: string | Buffer, type: string, extra?: Record<string, string>): void {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store", ...extra });
  res.end(body);
}

function etagFor(bytes: Uint8Array): string {
  return `"${createHash("sha256").update(bytes).digest("hex")}"`;
}

function ioFailure(error: unknown): { status: number; code: string; message: string } {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
  if (code === "ENOENT") return { status: 404, code: "not_found", message: "Opened file is missing." };
  if (code === "ENOSPC") return { status: 507, code: "disk_full", message: "Disk is full." };
  if (code === "EACCES" || code === "EPERM") {
    return { status: 403, code: "permission", message: "Permission denied." };
  }
  return {
    status: 500,
    code: "io",
    message: error instanceof Error ? error.message : String(error),
  };
}

function injectStudio(html: string, token: string, fileName: string): string {
  const snippet = `<script>window.__MAPGRAIN_STUDIO__=${JSON.stringify({ token, fileName })};</script>`;
  return html.includes("</head>") ? html.replace("</head>", `${snippet}</head>`) : `${snippet}${html}`;
}

function openBrowser(url: string): void {
  if (process.env.MAPGRAIN_STUDIO_NO_OPEN === "1" || process.env.CI === "true") return;
  const args =
    process.platform === "darwin"
      ? ["open", [url]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", "", url]]
        : ["xdg-open", [url]];
  const child = spawn(args[0] as string, args[1] as string[], { detached: true, stdio: "ignore" });
  child.unref();
}

async function listen(port: number): Promise<Server> {
  const server = createServer();
  await new Promise<void>((resolveListen, reject) => {
    const onError = (error: Error) => {
      server.off("error", onError);
      reject(error);
    };
    server.once("error", onError);
    server.listen(port, STUDIO_HOST, () => {
      server.off("error", onError);
      resolveListen();
    });
  });
  return server;
}

async function resolveAssets(assets?: string): Promise<string> {
  const preferred = assets ?? studioDir();
  try {
    await access(join(preferred, "index.html"));
    return preferred;
  } catch {
    const fallback = studioFixtureDir();
    await access(join(fallback, "index.html"));
    return fallback;
  }
}

export async function startStudio(file: string, assets?: string, disk?: Partial<StudioDisk>): Promise<StudioServer> {
  const root = await resolveAssets(assets);
  await access(file);
  const token = randomBytes(16).toString("hex");
  const fileName = file.split(/[/\\]/).at(-1) ?? "diagram.json";
  let selected: Server | null = null;
  let selectedPort = STUDIO_PORT;
  for (let i = 0; i < STUDIO_PORT_TRIES; i += 1) {
    const port = STUDIO_PORT + i;
    try {
      selected = await listen(port);
      selectedPort = port;
      break;
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== "EADDRINUSE") throw error;
    }
  }
  if (!selected) throw new Error(`could not bind ${STUDIO_HOST} from port ${STUDIO_PORT}`);

  let writes: Promise<void> = Promise.resolve();
  const enqueue = (task: () => Promise<void>): Promise<void> => {
    const run = writes.then(task, task);
    writes = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };

  const io: StudioDisk = {
    readFile: disk?.readFile ?? readFile,
    writeFile: disk?.writeFile ?? writeFile,
    rename: disk?.rename ?? rename,
    unlink: disk?.unlink ?? unlink,
  };

  selected.on("request", (req, res) => {
    void handle(req, res, {
      file,
      fileName,
      token,
      port: selectedPort,
      assets: root,
      enqueue,
      disk: io,
    });
  });

  const url = `http://${STUDIO_HOST}:${selectedPort}/?session=${token}`;
  return {
    url,
    port: selectedPort,
    token,
    close: () =>
      new Promise((resolveClose, reject) => {
        selected?.close((error) => (error ? reject(error) : resolveClose()));
      }),
  };
}

async function handle(
  req: IncomingMessage,
  res: ServerResponse,
  ctx: {
    file: string;
    fileName: string;
    token: string;
    port: number;
    assets: string;
    enqueue: (task: () => Promise<void>) => Promise<void>;
    disk: StudioDisk;
  },
): Promise<void> {
  if (!hostOk(req, ctx.port) || !originOk(req, ctx.port)) {
    send(res, 403, JSON.stringify({ ok: false, error: "forbidden origin" }), "application/json");
    return;
  }
  const url = new URL(req.url ?? "/", `http://${STUDIO_HOST}:${ctx.port}`);
  if (url.pathname === "/api/document") {
    if (!sessionOf(req, ctx.token)) {
      send(res, 403, JSON.stringify({ ok: false, error: "invalid session" }), "application/json");
      return;
    }
    if (req.method === "GET") {
      try {
        const bytes = await ctx.disk.readFile(ctx.file);
        send(res, 200, bytes, "application/json; charset=utf-8", { etag: etagFor(bytes) });
      } catch (error) {
        const failure = ioFailure(error);
        send(res, failure.status, JSON.stringify({ ok: false, error: failure.message, code: failure.code }), "application/json");
      }
      return;
    }
    if (req.method === "PUT") {
      let body: Buffer;
      try {
        body = await readBody(req);
      } catch (error) {
        send(
          res,
          400,
          JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }),
          "application/json",
        );
        return;
      }
      await ctx.enqueue(async () => {
        try {
          let parsed: unknown;
          try {
            parsed = JSON.parse(body.toString("utf8")) as unknown;
          } catch {
            send(res, 400, JSON.stringify({ ok: false, error: "invalid json" }), "application/json");
            return;
          }
          const validated = validateDocument(parsed);
          if (!validated.ok) {
            send(
              res,
              400,
              JSON.stringify({ ok: false, error: "invalid document", errors: validated.errors }),
              "application/json",
            );
            return;
          }
          let current: Buffer;
          try {
            current = await ctx.disk.readFile(ctx.file);
          } catch (error) {
            const failure = ioFailure(error);
            send(res, failure.status, JSON.stringify({ ok: false, error: failure.message, code: failure.code }), "application/json");
            return;
          }
          const expected = header(req, STUDIO_IF_MATCH);
          const currentTag = etagFor(current);
          if (!expected) {
            send(res, 428, JSON.stringify({ ok: false, error: "if-match required", code: "if_match" }), "application/json");
            return;
          }
          if (expected !== currentTag) {
            send(res, 409, JSON.stringify({ ok: false, error: "stale write", code: "conflict" }), "application/json");
            return;
          }
          const next = new TextEncoder().encode(`${JSON.stringify(validated.document, null, 2)}\n`);
          const tmp = uniqueSiblingTemp(ctx.file);
          try {
            await ctx.disk.writeFile(tmp, next);
          } catch (error) {
            await ctx.disk.unlink(tmp).catch(() => undefined);
            const failure = ioFailure(error);
            send(res, failure.status, JSON.stringify({ ok: false, error: failure.message, code: failure.code }), "application/json");
            return;
          }
          try {
            await ctx.disk.rename(tmp, ctx.file);
          } catch {
            await ctx.disk.unlink(tmp).catch(() => undefined);
            send(
              res,
              500,
              JSON.stringify({
                ok: false,
                error: "Could not replace the opened file.",
                code: "rename_failed",
              }),
              "application/json",
            );
            return;
          }
          send(
            res,
            200,
            JSON.stringify({ ok: true, action: "write", path: ctx.fileName }),
            "application/json",
            { etag: etagFor(next) },
          );
        } catch (error) {
          if (!res.headersSent) {
            const failure = ioFailure(error);
            send(
              res,
              failure.status,
              JSON.stringify({ ok: false, error: failure.message, code: failure.code }),
              "application/json",
            );
          }
        }
      });
      return;
    }
    send(res, 405, JSON.stringify({ ok: false, error: "method not allowed" }), "application/json");
    return;
  }

  if (req.method !== "GET") {
    send(res, 405, "method not allowed", "text/plain");
    return;
  }
  const target = safeFile(ctx.assets, url.pathname);
  if (!target) {
    send(res, 404, "not found", "text/plain");
    return;
  }
  try {
    const bytes = await readFile(target);
    const type = MIME[extname(target)] ?? "application/octet-stream";
    const extra = { "set-cookie": `${STUDIO_COOKIE}=${ctx.token}; Path=/; HttpOnly; SameSite=Strict` };
    if (extname(target) === ".html" || url.pathname === "/") {
      send(res, 200, injectStudio(bytes.toString("utf8"), ctx.token, ctx.fileName), type, extra);
      return;
    }
    send(res, 200, bytes, type, extra);
  } catch {
    send(res, 404, "not found", "text/plain");
  }
}

export async function runStudio(file: string, io: CliIo): Promise<number> {
  let server: StudioServer;
  try {
    server = await startStudio(file);
  } catch (error) {
    return fail(
      io,
      [
        {
          code: DIAGNOSTIC_CODE.STUDIO,
          message: error instanceof Error ? error.message : String(error),
          path: file,
          elementId: null,
        },
      ],
      EXIT_CODE.ERROR,
    );
  }
  io.stdout.write(
    `${JSON.stringify({
      ok: true,
      command: "studio",
      url: server.url,
      port: server.port,
      bind: STUDIO_HOST,
      file,
    })}\n`,
  );
  openBrowser(server.url);
  await new Promise<void>((resolveWait) => {
    const stop = () => {
      process.off("SIGINT", stop);
      process.off("SIGTERM", stop);
      resolveWait();
    };
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
  });
  await server.close();
  return EXIT_CODE.OK;
}
