import { OFFLINE_CACHE_PREFIX, OFFLINE_MESSAGE, SERVICE_WORKER_PATH } from "../constants/offline.ts";

let allowActivate = true;

export function setOfflineUpdateAllowed(allowed: boolean): void {
  allowActivate = allowed;
}

export async function unregisterOffline(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
}

export function registerOffline(): void {
  if (!import.meta.env.PROD) return;
  if (!("serviceWorker" in navigator)) return;
  void boot();
}

async function boot(): Promise<void> {
  const url = new URL(SERVICE_WORKER_PATH, globalThis.location.href);
  const registration = await navigator.serviceWorker.register(url, { updateViaCache: "none" });
  const waiting = registration.waiting;
  if (waiting && allowActivate && navigator.serviceWorker.controller) {
    const marker = "mapgrain-offline-activating";
    if (sessionStorage.getItem(marker) === waiting.scriptURL) {
      sessionStorage.removeItem(marker);
    } else {
      sessionStorage.setItem(marker, waiting.scriptURL);
      waiting.postMessage(OFFLINE_MESSAGE.SKIP_WAITING);
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true });
      });
      globalThis.location.reload();
      return;
    }
  }
  await navigator.serviceWorker.ready;
  const names = await caches.keys();
  if (names.some((name) => name.startsWith(OFFLINE_CACHE_PREFIX))) {
    globalThis.document.documentElement.dataset.offline = "ready";
  }
}
