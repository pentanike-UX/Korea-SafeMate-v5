/**
 * Default: OpenFreeMap (OSM-based, no API key). Good for dev + MVP worldwide including Korea.
 * Override with NEXT_PUBLIC_MAP_STYLE_URL — e.g. MapTiler, Mapbox (must be a valid http(s) URL).
 *
 * **Display:** Naver Dynamic Map when `NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID` is set (see `map-display-mode.ts`), else MapLibre.
 * **Directions 5:** server-only (see `naver-directions-env.server.ts`).
 */
export const DEFAULT_MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

function isAllowedMapStyleUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return (u.protocol === "https:" || u.protocol === "http:") && Boolean(u.hostname);
  } catch {
    return false;
  }
}

/** Safe style URL for MapLibre; invalid env values fall back to default (avoids runtime init errors). */
export function getMapStyleUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_MAP_STYLE_URL?.trim();
  if (fromEnv && isAllowedMapStyleUrl(fromEnv)) return fromEnv;
  return DEFAULT_MAP_STYLE_URL;
}
