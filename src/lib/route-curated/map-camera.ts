import type { Map } from "maplibre-gl";
import type { LatLng } from "@/domain/curated-experience";
import { boundsFromLatLngs } from "@/lib/route-curated/geometry";

function padBounds(b: { minLng: number; minLat: number; maxLng: number; maxLat: number }) {
  const lngSpan = b.maxLng - b.minLng;
  const latSpan = b.maxLat - b.minLat;
  const padLng = lngSpan < 1e-6 ? 0.008 : lngSpan * 0.08;
  const padLat = latSpan < 1e-6 ? 0.008 : latSpan * 0.08;
  return { padLng, padLat };
}

/** Fit map to a set of WGS84 points (full route or one segment). */
export function fitMapToLatLngs(
  map: Map,
  points: LatLng[],
  opts?: { maxZoom?: number; duration?: number; padding?: number },
) {
  const b = boundsFromLatLngs(points);
  if (!b) return;
  const { padLng, padLat } = padBounds(b);
  const padding = opts?.padding ?? 56;
  map.fitBounds(
    [
      [b.minLng - padLng, b.minLat - padLat],
      [b.maxLng + padLng, b.maxLat + padLat],
    ],
    {
      padding,
      maxZoom: opts?.maxZoom ?? 15,
      duration: opts?.duration ?? 380,
    },
  );
}

/** Focus one stop without refitting the whole route (avoids fighting card selection). */
export function easeMapToStop(
  map: Map,
  lng: number,
  lat: number,
  opts?: { minZoom?: number; maxZoom?: number; duration?: number },
) {
  const z = map.getZoom();
  const minZ = opts?.minZoom ?? 13.2;
  const maxZ = opts?.maxZoom ?? 15;
  const targetZoom = Math.min(maxZ, Math.max(minZ, z));
  map.easeTo({
    center: [lng, lat],
    zoom: targetZoom,
    duration: opts?.duration ?? 420,
    essential: true,
  });
}

export function pathCoordsFingerprint(coords: [number, number][]): string {
  if (!coords.length) return "0";
  const a = coords[0]!;
  const b = coords[coords.length - 1]!;
  return `${coords.length}:${a[0]},${a[1]}:${b[0]},${b[1]}`;
}
