"use client";

import type { LatLng } from "@/domain/curated-experience";
import { sameOriginApiUrl } from "@/lib/api-origin";

export type OsrmClientResult = {
  path: LatLng[];
  distanceMeters: number | null;
  durationSeconds: number | null;
};

/** Fetch foot routing geometry via app OSRM proxy (real streets). */
export async function fetchOsrmFootPath(a: LatLng, b: LatLng): Promise<OsrmClientResult> {
  const res = await fetch(sameOriginApiUrl("/api/routing/osrm"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      coordinates: [{ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng }],
      profile: "foot",
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    path?: { lat: number; lng: number }[];
    distance_m?: number | null;
    duration_s?: number | null;
    error?: string;
    code?: string;
  };
  if (!res.ok) {
    if (res.status === 429) throw new Error("TOO_MANY_REQUESTS");
    throw new Error(data.error ?? `OSRM ${res.status}`);
  }
  if (data.error || !data.path?.length) {
    throw new Error(data.error ?? "Empty path");
  }
  return {
    path: data.path.map((p) => ({ lat: p.lat, lng: p.lng })),
    distanceMeters: data.distance_m ?? null,
    durationSeconds: data.duration_s ?? null,
  };
}
