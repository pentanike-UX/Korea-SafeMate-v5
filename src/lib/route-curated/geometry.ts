import type { LatLng, PathSegment, RouteStop } from "@/domain/curated-experience";

/** Single LineString for the full route (street-following, no straight shortcuts). */
export function mergePathSegments(segments: PathSegment[]): LatLng[] {
  const out: LatLng[] = [];
  for (const seg of segments) {
    for (const p of seg.polyline) {
      const prev = out[out.length - 1];
      if (prev && prev.lat === p.lat && prev.lng === p.lng) continue;
      out.push(p);
    }
  }
  return out;
}

export function segmentHighlightForStop(
  stop: RouteStop,
  segments: PathSegment[],
): PathSegment | null {
  if (!segments.length) return null;
  if (stop.order <= 1) return segments[0] ?? null;
  return segments.find((s) => s.toStopId === stop.id) ?? null;
}

export function aggregatePathStats(segments: PathSegment[]) {
  const distanceMeters = segments.reduce((s, x) => s + x.distanceMeters, 0);
  const durationMinutes = segments.reduce((s, x) => s + x.durationMinutes, 0);
  return { distanceMeters, durationMinutes };
}

export function boundsFromLatLngs(points: LatLng[]): { minLng: number; minLat: number; maxLng: number; maxLat: number } | null {
  if (!points.length) return null;
  let minLng = points[0]!.lng;
  let maxLng = points[0]!.lng;
  let minLat = points[0]!.lat;
  let maxLat = points[0]!.lat;
  for (const p of points) {
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
  }
  return { minLng, minLat, maxLng, maxLat };
}
