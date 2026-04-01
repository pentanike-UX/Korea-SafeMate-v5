import type { NormalizedDirections } from "@/lib/routing/directions-types";

const store = new Map<string, { expires: number; value: NormalizedDirections }>();
const MAX = 80;
const DEFAULT_TTL_MS = 60 * 60 * 1000;

export function directionsCacheGet(key: string): NormalizedDirections | null {
  const row = store.get(key);
  if (!row) return null;
  if (Date.now() > row.expires) {
    store.delete(key);
    return null;
  }
  return row.value;
}

export function directionsCacheSet(key: string, value: NormalizedDirections, ttlMs = DEFAULT_TTL_MS) {
  if (store.size >= MAX) {
    const first = store.keys().next().value as string | undefined;
    if (first) store.delete(first);
  }
  store.set(key, { value, expires: Date.now() + ttlMs });
}

export function directionsCacheKey(profile: string, coordKey: string) {
  return `${profile}:${coordKey}`;
}

export function hashCoordinates(coords: { lat: number; lng: number }[]): string {
  return coords.map((c) => `${c.lat.toFixed(5)},${c.lng.toFixed(5)}`).join("|");
}
