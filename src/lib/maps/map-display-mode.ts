/**
 * Client-only map provider selection (NEXT_PUBLIC_* only — never read secrets here).
 */

function trimId(v: string | undefined): string {
  return v?.trim() ?? "";
}

/** Dynamic Map: NCP JS SDK with `ncpClientId` (browser-safe ID only). */
export function getNaverMapsNcpClientId(): string {
  return trimId(process.env.NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID);
}

/** When true, use MapLibre / schematic instead of Naver Dynamic Map (client bundle). */
export function isNaverMapsMockClient(): boolean {
  const a = process.env.NEXT_PUBLIC_NAVER_MAPS_USE_MOCK?.trim().toLowerCase();
  if (a === "true" || a === "1" || a === "yes") return true;
  return false;
}

/** Use Naver Dynamic Map on the client when ID is set and mock is off. */
export function isNaverDynamicMapEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_MAP_PROVIDER === "schematic") return false;
  if (isNaverMapsMockClient()) return false;
  const id = getNaverMapsNcpClientId();
  if (!id || id === "...") return false;
  return true;
}
