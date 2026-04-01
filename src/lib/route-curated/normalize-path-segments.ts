import type { PathSegment } from "@/domain/curated-experience";

/** Drop degenerate polylines and ensure stats are finite. */
export function normalizePathSegments(segments: PathSegment[]): PathSegment[] {
  return segments.map((seg) => {
    const polyline = seg.polyline.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    if (polyline.length < 2 && seg.polyline.length > 0 && process.env.NODE_ENV === "development") {
      console.warn("[route-segment] degenerate polyline", seg.id, seg.fromStopId, "→", seg.toStopId);
    }
    return {
      ...seg,
      polyline,
      distanceMeters: Number.isFinite(seg.distanceMeters) ? Math.max(0, seg.distanceMeters) : 0,
      durationMinutes: Number.isFinite(seg.durationMinutes) ? Math.max(0, seg.durationMinutes) : 0,
    };
  });
}
