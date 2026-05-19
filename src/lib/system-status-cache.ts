/** Short-lived cache for maintenance/status checks (avoids refetch on every route). */

const TTL_MS = 60_000;

let cache: { at: number; maintenance: boolean; reason?: string } | null = null;

export function getCachedMaintenanceStatus(): { maintenance: boolean; reason?: string } | null {
  if (!cache || Date.now() - cache.at > TTL_MS) return null;
  return { maintenance: cache.maintenance, reason: cache.reason };
}

export function setCachedMaintenanceStatus(maintenance: boolean, reason?: string): void {
  cache = { at: Date.now(), maintenance, reason };
}
