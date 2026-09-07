export function isProviderConfigured(env?: Record<string, string | undefined>): boolean {
  const source =
    env ??
    (typeof import.meta.env === "object" && import.meta.env
      ? (import.meta.env as Record<string, string | undefined>)
      : {});
  return Boolean(source.VITE_MAPGRAIN_PROVIDER);
}
