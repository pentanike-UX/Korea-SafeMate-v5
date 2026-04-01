import type { LatLng } from "@/domain/curated-experience";

export type DirectionsProfile = "foot" | "driving";

/** Normalized leg geometry + stats for map overlays (NAVER or OSRM). */
export type NormalizedDirections = {
  path: LatLng[];
  distanceMeters: number | null;
  durationSeconds: number | null;
  provider: "naver" | "osrm";
  profile: DirectionsProfile;
  /** Optional road-section metadata (NAVER driving). */
  sections?: { name: string; distanceMeters: number; pointIndex: number; pointCount: number }[];
};

export type DirectionsRequestBody = {
  coordinates: { lat: number; lng: number }[];
  profile?: DirectionsProfile;
};
