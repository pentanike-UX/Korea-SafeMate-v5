import type { NormalizedDirections, DirectionsProfile } from "@/lib/routing/directions-types";
import {
  directionsCacheGet,
  directionsCacheSet,
  directionsCacheKey,
  hashCoordinates,
} from "@/lib/routing/directions-memory-cache";
import { logDirections } from "@/lib/routing/directions-log";
import { getNaverDirectionsCredentials, isNaverDirectionsMock } from "@/lib/routing/naver-directions-env.server";

/** NAVER Cloud Maps Directions 5 — driving, start/goal only (lng,lat order in query). */
async function fetchNaverDriving(
  start: { lat: number; lng: number },
  goal: { lat: number; lng: number },
): Promise<NormalizedDirections | null> {
  const keys = getNaverDirectionsCredentials();
  if (!keys) return null;

  const startQ = `${start.lng},${start.lat}`;
  const goalQ = `${goal.lng},${goal.lat}`;
  const url = `https://maps.apigw.ntruss.com/map-direction/v1/driving?start=${encodeURIComponent(startQ)}&goal=${encodeURIComponent(goalQ)}`;

  const res = await fetch(url, {
    headers: {
      "x-ncp-apigw-api-key-id": keys.id,
      "x-ncp-apigw-api-key": keys.secret,
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    logDirections("naver_http", { status: res.status });
    return null;
  }

  const data = (await res.json()) as {
    code?: number;
    message?: string;
    route?: {
      traoptimal?: {
        summary?: { distance?: number; duration?: number };
        path?: [number, number][];
        section?: { pointIndex: number; pointCount: number; distance: number; name: string }[];
      }[];
    };
  };

  if (data.code !== 0) {
    logDirections("naver_route_error", { code: data.code ?? null, message: data.message ?? null });
    return null;
  }

  const traj = data.route?.traoptimal?.[0];
  if (!traj?.path?.length) return null;

  const path = traj.path.map(([lng, lat]) => ({ lat, lng }));
  const summary = traj.summary;
  const durationMs = summary?.duration;
  const durationSeconds = durationMs != null ? Math.max(1, Math.round(durationMs / 1000)) : null;

  const sections = traj.section?.map((s) => ({
    name: s.name,
    distanceMeters: s.distance,
    pointIndex: s.pointIndex,
    pointCount: s.pointCount,
  }));

  return {
    path,
    distanceMeters: summary?.distance ?? null,
    durationSeconds,
    provider: "naver",
    profile: "driving",
    sections,
  };
}

async function fetchOsrm(
  coordinates: { lat: number; lng: number }[],
  profile: DirectionsProfile,
): Promise<NormalizedDirections | null> {
  const osrmProfile = profile === "driving" ? "driving" : "foot";
  const base = process.env.OSRM_BASE_URL?.replace(/\/$/, "") ?? "https://router.project-osrm.org";
  const coordStr = coordinates.map((c) => `${c.lng},${c.lat}`).join(";");
  const url = `${base}/route/v1/${osrmProfile}/${coordStr}?overview=full&geometries=geojson`;

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) {
    logDirections("osrm_http", { status: res.status });
    return null;
  }

  const data = (await res.json()) as {
    code?: string;
    message?: string;
    routes?: { geometry?: { coordinates?: [number, number][] }; distance?: number; duration?: number }[];
  };

  if (data.code !== "Ok" || !data.routes?.[0]) {
    logDirections("osrm_route_error", { code: data.code ?? null, message: data.message ?? null });
    return null;
  }

  const route = data.routes[0];
  const coords = route.geometry?.coordinates;
  if (!coords?.length) return null;

  return {
    path: coords.map(([lng, lat]) => ({ lat, lng })),
    distanceMeters: route.distance ?? null,
    durationSeconds: route.duration != null ? Math.round(route.duration) : null,
    provider: "osrm",
    profile: osrmProfile === "driving" ? "driving" : "foot",
  };
}

export type ResolveDirectionsHooks = {
  /** 캐시 미스 후 실제 네트워크 호출로 얻은 결과일 때만 호출 */
  onLiveResolution?: (result: NormalizedDirections) => void;
};

export async function resolveDirections(
  coordinates: { lat: number; lng: number }[],
  profile: DirectionsProfile = "foot",
  hooks?: ResolveDirectionsHooks,
): Promise<NormalizedDirections | null> {
  if (coordinates.length < 2) return null;

  const coordKey = hashCoordinates(coordinates);
  const ckey = directionsCacheKey(profile, coordKey);
  const cached = directionsCacheGet(ckey);
  if (cached) {
    logDirections("cache", { result: "hit", profile, provider: cached.provider });
    return cached;
  }

  logDirections("cache", { result: "miss", profile });

  let result: NormalizedDirections | null = null;

  if (profile === "driving" && coordinates.length === 2 && !isNaverDirectionsMock()) {
    result = await fetchNaverDriving(coordinates[0]!, coordinates[1]!);
  }

  if (!result) {
    result = await fetchOsrm(coordinates, profile);
  }

  if (result) {
    directionsCacheSet(ckey, result);
    logDirections("resolved", { profile: result.profile, provider: result.provider, points: result.path.length });
    hooks?.onLiveResolution?.(result);
  } else {
    logDirections("failed", { profile });
  }

  return result;
}
