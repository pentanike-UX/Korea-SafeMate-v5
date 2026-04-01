/**
 * NAVER Cloud Platform Maps API credentials for **server-side** Directions 5 only.
 *
 * Priority (first match wins per field):
 * - `NCP_MAP_API_KEY_ID` + `NCP_MAP_API_KEY`
 * - `NAVER_MAPS_CLIENT_ID` + `NAVER_MAPS_CLIENT_SECRET` (Application credentials)
 * - `NAVER_MAP_CLIENT_ID` + `NAVER_MAP_CLIENT_SECRET` (legacy)
 * Never use `NEXT_PUBLIC_*` for secrets.
 */
export function getNaverDirectionsCredentials(): { id: string; secret: string } | null {
  const id =
    process.env.NCP_MAP_API_KEY_ID?.trim() ||
    process.env.NAVER_MAPS_CLIENT_ID?.trim() ||
    process.env.NAVER_MAP_CLIENT_ID?.trim();
  const secret =
    process.env.NCP_MAP_API_KEY?.trim() ||
    process.env.NAVER_MAPS_CLIENT_SECRET?.trim() ||
    process.env.NAVER_MAP_CLIENT_SECRET?.trim();
  return id && secret ? { id, secret } : null;
}

/** When true, skip NAVER Directions 5 and use OSRM (and other fallbacks) only. */
export function isNaverDirectionsMock(): boolean {
  const v = process.env.NAVER_MAPS_USE_MOCK?.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}
