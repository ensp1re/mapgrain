import { SERVICE_WORKER_PATH } from "../constants/offline.ts";

export function registerOffline(): void {
  if (!import.meta.env.PROD) return;
  if (!("serviceWorker" in navigator)) return;
  const url = new URL(SERVICE_WORKER_PATH, globalThis.location.href);
  void navigator.serviceWorker.register(url);
}
