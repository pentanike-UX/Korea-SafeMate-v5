import type { LatLng } from "@/domain/curated-experience";
import { boundsFromLatLngs } from "@/lib/route-curated/geometry";

/** Naver `maps` namespace from `window.naver.maps` (typed loosely to avoid SDK drift). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NMaps = any;

/** Fit map to WGS84 points (padding + max zoom clamp). */
export function naverFitMapToLatLngs(
  maps: NMaps,
  map: NMaps,
  points: LatLng[],
  opts?: { maxZoom?: number },
): void {
  const b = boundsFromLatLngs(points);
  if (!b) return;
  const lngSpan = b.maxLng - b.minLng;
  const latSpan = b.maxLat - b.minLat;
  const padLng = lngSpan < 1e-6 ? 0.008 : lngSpan * 0.08;
  const padLat = latSpan < 1e-6 ? 0.008 : latSpan * 0.08;
  const bounds = new maps.LatLngBounds(
    new maps.LatLng(b.minLat - padLat, b.minLng - padLng),
    new maps.LatLng(b.maxLat + padLat, b.maxLng + padLng),
  );
  map.fitBounds(bounds);
  const maxZ = opts?.maxZoom ?? 15;
  window.requestAnimationFrame(() => {
    const z = map.getZoom();
    if (z > maxZ) map.setZoom(maxZ);
  });
}

export function naverEaseMapToStop(maps: NMaps, map: NMaps, lng: number, lat: number): void {
  const z = map.getZoom();
  const targetZoom = Math.min(15, Math.max(13.2, z));
  const ll = new maps.LatLng(lat, lng);
  if (typeof map.morph === "function") {
    map.morph(ll, targetZoom, { duration: 420 });
    return;
  }
  map.setCenter(ll);
  map.setZoom(targetZoom, true);
}
