import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import {
  OFFLINE_CACHE_PREFIX,
  OFFLINE_MANIFEST_NAME,
  OFFLINE_MESSAGE,
  SERVICE_WORKER_PATH,
} from "../constants/offline.ts";
import type { OfflineManifest } from "../types/offline.ts";

const PRECACHE_EXT = new Set([".html", ".js", ".css", ".woff", ".woff2", ".svg", ".json"]);
const SKIP_FROM_HASH = new Set([SERVICE_WORKER_PATH, OFFLINE_MANIFEST_NAME]);

async function walkFiles(dir: string): Promise<string[]> {
  const names = await readdir(dir);
  const files: string[] = [];
  for (const name of names) {
    if (name === ".vite") continue;
    const abs = join(dir, name);
    const info = await stat(abs);
    if (info.isDirectory()) {
      files.push(...(await walkFiles(abs)));
      continue;
    }
    if (info.isFile()) files.push(abs);
  }
  return files;
}

function asPublicPath(distDir: string, abs: string): string {
  return `/${relative(distDir, abs).split("\\").join("/")}`;
}

export function shouldInterceptFetch(method: string, url: URL): boolean {
  if (method !== "GET") return false;
  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) return false;
  if (url.searchParams.has("session")) return false;
  return true;
}

export function cachesToDelete(existing: string[], prefix: string, current: string): string[] {
  return existing.filter((name) => name.startsWith(prefix) && name !== current);
}

export function shouldCacheResponse(status: number, headers: { get(name: string): string | null }): boolean {
  if (status < 200 || status >= 300) return false;
  const control = headers.get("cache-control") ?? "";
  if (/\bno-store\b/i.test(control)) return false;
  if (headers.get("set-cookie")) return false;
  return true;
}

export async function collectOfflineManifest(distDir: string): Promise<OfflineManifest> {
  const files = await walkFiles(distDir);
  const assets = new Set<string>(["/", `/${SERVICE_WORKER_PATH}`, `/${OFFLINE_MANIFEST_NAME}`]);
  const hashes: string[] = [];
  for (const abs of files) {
    const rel = relative(distDir, abs).split("\\").join("/");
    if (rel.endsWith(".map")) continue;
    const ext = extname(rel);
    if (!PRECACHE_EXT.has(ext)) continue;
    const path = asPublicPath(distDir, abs);
    assets.add(path);
    if (SKIP_FROM_HASH.has(rel)) continue;
    hashes.push(`${path}:${createHash("sha256").update(await readFile(abs)).digest("hex")}`);
  }
  const version = createHash("sha256").update(hashes.sort().join("|")).digest("hex").slice(0, 16);
  return { version, assets: [...assets].sort() };
}

export function renderServiceWorker(manifest: OfflineManifest): string {
  return `const PREFIX = ${JSON.stringify(OFFLINE_CACHE_PREFIX)};
const VERSION = ${JSON.stringify(manifest.version)};
const CACHE = PREFIX + VERSION;
const ASSETS = ${JSON.stringify(manifest.assets)};
const ASSET_SET = new Set(ASSETS);

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
    if (!self.registration.active) await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names.filter((name) => name.startsWith(PREFIX) && name !== CACHE).map((name) => caches.delete(name)),
    );
    await self.clients.claim();
    const windows = await self.clients.matchAll({ type: "window" });
    for (const client of windows) {
      client.postMessage({ type: ${JSON.stringify(OFFLINE_MESSAGE.READY)}, version: VERSION });
    }
  })());
});

self.addEventListener("message", (event) => {
  if (event.data === ${JSON.stringify(OFFLINE_MESSAGE.SKIP_WAITING)}) self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) return;
  if (url.searchParams.has("session")) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const byPath = await cache.match(url.pathname);
    if (byPath) return byPath;
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const index = (await cache.match("/index.html")) || (await cache.match("/"));
      if (index) return index;
    }
    if (!ASSET_SET.has(url.pathname)) return fetch(request);
    return fetch(request);
  })());
});
`;
}
