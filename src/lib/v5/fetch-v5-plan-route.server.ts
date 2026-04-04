"use server";

import { headers } from "next/headers";
import {
  consumeDirectionsRateLimit,
  getClientIpFromHeaders,
} from "@/lib/routing/directions-api-guard.server";
import {
  resolveDirections,
  type ResolveDirectionsHooks,
} from "@/lib/routing/resolve-directions.server";
import type { DirectionsProfile } from "@/lib/routing/directions-types";
import { getServerSupabaseForUser } from "@/lib/supabase/server-user";
import { recordWaylyUsageFireAndForget } from "@/lib/wayly/record-usage.server";
import type { PlanTransitMode, SurfaceProfile } from "@/lib/v5/plan-transit-estimate.server";
import {
  estimateFerryLegSeconds,
  estimateFlightLegSeconds,
  inferTransitModeFromSpotText,
  inferSurfaceProfileFromText,
} from "@/lib/v5/plan-transit-estimate.server";

const MAX_COORDS = 25;

/** 라우팅 입력 — 스팟 i→i+1 이동은 spots[i].transitMode / transitToNext 로 판별 */
export type PlanRouteSpotInput = {
  lat: number;
  lng: number;
  transitMode?: PlanTransitMode;
  transitToNext?: string;
};

/** 스팟 i → i+1 구간 */
export type V5PlanRouteLegSummary = {
  durationSeconds: number | null;
  distanceMeters: number | null;
  mode?: PlanTransitMode;
};

export type V5PlanRouteSuccess = {
  ok: true;
  coordinates: [number, number][];
  kind:
    | "full-foot"
    | "full-driving"
    | "chained-foot"
    | "chained-driving"
    | "chained-mixed"
    | "chained-air";
  legs: V5PlanRouteLegSummary[];
};

export type V5PlanRouteFailure = {
  ok: false;
  code: "TOO_FEW_POINTS" | "EMPTY" | "RATE_LIMIT" | "INVALID";
};

export type V5PlanRouteResult = V5PlanRouteSuccess | V5PlanRouteFailure;

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function maxLegMeters(coords: { lat: number; lng: number }[]): number {
  let m = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    m = Math.max(m, haversineMeters(coords[i]!, coords[i + 1]!));
  }
  return m;
}

function mergeLngLatPaths(segments: [number, number][][]): [number, number][] {
  const out: [number, number][] = [];
  for (const seg of segments) {
    if (seg.length === 0) continue;
    if (out.length === 0) {
      out.push(...seg);
      continue;
    }
    const last = out[out.length - 1]!;
    const first = seg[0]!;
    const dup =
      Math.abs(last[0] - first[0]) < 1e-7 && Math.abs(last[1] - first[1]) < 1e-7;
    out.push(...(dup ? seg.slice(1) : seg));
  }
  return out;
}

function validateCoords(coordinates: { lat: number; lng: number }[]): V5PlanRouteFailure | null {
  if (coordinates.length < 2) return { ok: false, code: "TOO_FEW_POINTS" };
  if (coordinates.length > MAX_COORDS) return { ok: false, code: "INVALID" };
  for (const c of coordinates) {
    if (
      typeof c.lat !== "number" ||
      typeof c.lng !== "number" ||
      !Number.isFinite(c.lat) ||
      !Number.isFinite(c.lng)
    ) {
      return { ok: false, code: "INVALID" };
    }
  }
  return null;
}

/** 스팟 i → i+1 레그의 이동 모드 (spots[i] 메타 기준) */
function resolveLegModeFromSpot(spot: PlanRouteSpotInput): PlanTransitMode {
  return spot.transitMode ?? inferTransitModeFromSpotText(spot.transitToNext);
}

function allSurfaceLegs(spots: PlanRouteSpotInput[]): boolean {
  for (let i = 0; i < spots.length - 1; i++) {
    if (resolveLegModeFromSpot(spots[i]!) !== "surface") return false;
  }
  return true;
}

async function tryFullRoute(
  coords: { lat: number; lng: number }[],
  profile: DirectionsProfile,
  hooks?: ResolveDirectionsHooks,
): Promise<[number, number][] | null> {
  const data = await resolveDirections(coords, profile, hooks);
  if (!data?.path?.length || data.path.length < 2) return null;
  return data.path.map((p) => [p.lng, p.lat] as [number, number]);
}

async function collectLegSummaries(
  coords: { lat: number; lng: number }[],
  primary: DirectionsProfile,
  hooks?: ResolveDirectionsHooks,
): Promise<V5PlanRouteLegSummary[]> {
  const out: V5PlanRouteLegSummary[] = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i]!;
    const b = coords[i + 1]!;
    let data = await resolveDirections([a, b], primary, hooks);
    if (!data?.durationSeconds) {
      const alt: DirectionsProfile = primary === "foot" ? "driving" : "foot";
      const data2 = await resolveDirections([a, b], alt, hooks);
      if (data2) data = data2;
    }
    out.push({
      durationSeconds: data?.durationSeconds ?? null,
      distanceMeters: data?.distanceMeters ?? null,
      mode: "surface",
    });
  }
  return out;
}

async function resolveSurfaceLeg(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  primary: DirectionsProfile,
  hooks?: ResolveDirectionsHooks,
): Promise<{
  path: [number, number][];
  straight: boolean;
  durationSeconds: number | null;
  distanceMeters: number | null;
}> {
  let data = await resolveDirections([a, b], primary, hooks);
  if (!data?.path?.length || data.path.length < 2) {
    const alt: DirectionsProfile = primary === "foot" ? "driving" : "foot";
    data = await resolveDirections([a, b], alt, hooks);
  }
  if (data?.path?.length && data.path.length >= 2) {
    return {
      path: data.path.map((p) => [p.lng, p.lat] as [number, number]),
      straight: false,
      durationSeconds: data.durationSeconds ?? null,
      distanceMeters: data.distanceMeters ?? null,
    };
  }
  // OSRM/네이버 모두 실패 시: haversine 직선거리 × 도로 보정 계수 + 속도 기반 추정 시간
  const straightDist = haversineMeters(a, b);
  const roadDist = straightDist * 1.3; // 직선→도로 보정 (한국 평균 ~1.3배)
  const speedMps = primary === "foot" ? 1.3 : 10; // 도보 4.7km/h, 차 36km/h (시내 평균)
  const estDuration = Math.round(roadDist / speedMps);

  return {
    path: [
      [a.lng, a.lat],
      [b.lng, b.lat],
    ],
    straight: true,
    durationSeconds: data?.durationSeconds ?? estDuration,
    distanceMeters: data?.distanceMeters ?? Math.round(roadDist),
  };
}

/**
 * 구간별 이어 붙이기 — 항공·페리는 직선 + 블록 시간, 지상은 도로 라우팅.
 */
async function buildChainedRoute(
  spots: PlanRouteSpotInput[],
  primary: DirectionsProfile,
  hooks?: ResolveDirectionsHooks,
): Promise<{
  merged: [number, number][];
  legs: V5PlanRouteLegSummary[];
  anyStraight: boolean;
  hasAirOrFerry: boolean;
}> {
  const pieces: [number, number][][] = [];
  const legs: V5PlanRouteLegSummary[] = [];
  let anyStraight = false;
  let hasAirOrFerry = false;

  for (let i = 0; i < spots.length - 1; i++) {
    const a = spots[i]!;
    const b = spots[i + 1]!;
    const mode = resolveLegModeFromSpot(a);

    if (mode === "flight") {
      hasAirOrFerry = true;
      const est = estimateFlightLegSeconds(a, b);
      pieces.push([
        [a.lng, a.lat],
        [b.lng, b.lat],
      ]);
      legs.push({
        durationSeconds: est.seconds,
        distanceMeters: est.distanceMeters,
        mode: "flight",
      });
      anyStraight = true;
      continue;
    }

    if (mode === "ferry") {
      hasAirOrFerry = true;
      const est = estimateFerryLegSeconds(a, b);
      pieces.push([
        [a.lng, a.lat],
        [b.lng, b.lat],
      ]);
      legs.push({
        durationSeconds: est.seconds,
        distanceMeters: est.distanceMeters,
        mode: "ferry",
      });
      anyStraight = true;
      continue;
    }

    // transitToNext 텍스트에서 구간별 foot/driving 힌트를 추출하여 primary를 오버라이드
    const textHint: SurfaceProfile | null = inferSurfaceProfileFromText(a.transitToNext);
    const legProfile: DirectionsProfile = textHint ?? primary;

    const leg = await resolveSurfaceLeg(a, b, legProfile, hooks);
    pieces.push(leg.path);
    if (leg.straight) anyStraight = true;
    legs.push({
      durationSeconds: leg.durationSeconds,
      distanceMeters: leg.distanceMeters,
      mode: "surface",
    });
  }

  return {
    merged: mergeLngLatPaths(pieces),
    legs,
    anyStraight,
    hasAirOrFerry,
  };
}

/**
 * 플랜 스팟 순서대로 경로·레그 시간을 만든다.
 * - 지상: OSRM/네이버 도보·주행
 * - 항공·페리: 대권 직선 표시 + 문-투-문 블록 추정(도로 API 미호출)
 */
export async function fetchV5PlanRouteGeometry(
  spots: PlanRouteSpotInput[],
): Promise<V5PlanRouteResult> {
  const coordinates = spots.map((s) => ({ lat: s.lat, lng: s.lng }));
  const invalid = validateCoords(coordinates);
  if (invalid) return invalid;

  const h = await headers();
  if (!consumeDirectionsRateLimit(`dir:${getClientIpFromHeaders(h)}`)) {
    return { ok: false, code: "RATE_LIMIT" };
  }

  const usage = { routing: 0, naver: 0 };
  const routeHooks: ResolveDirectionsHooks = {
    onLiveResolution: (r) => {
      usage.routing += 1;
      if (r.provider === "naver") usage.naver += 1;
    },
  };

  const maxLeg = maxLegMeters(coordinates);
  const primary: DirectionsProfile = maxLeg > 12_000 ? "driving" : "foot";
  const secondary: DirectionsProfile = primary === "foot" ? "driving" : "foot";

  const flushRoutingUsage = async () => {
    if (usage.routing < 1) return;
    const sb = await getServerSupabaseForUser();
    recordWaylyUsageFireAndForget(sb, {
      routingLive: usage.routing,
      naverLive: usage.naver,
    });
  };

  const surfaceOnly = allSurfaceLegs(spots);

  if (surfaceOnly) {
    const fullPrimary = await tryFullRoute(coordinates, primary, routeHooks);
    if (fullPrimary) {
      const legs = await collectLegSummaries(coordinates, primary, routeHooks);
      await flushRoutingUsage();
      return {
        ok: true,
        coordinates: fullPrimary,
        kind: primary === "foot" ? "full-foot" : "full-driving",
        legs,
      };
    }

    const fullSecondary = await tryFullRoute(coordinates, secondary, routeHooks);
    if (fullSecondary) {
      const legs = await collectLegSummaries(coordinates, secondary, routeHooks);
      await flushRoutingUsage();
      return {
        ok: true,
        coordinates: fullSecondary,
        kind: secondary === "foot" ? "full-foot" : "full-driving",
        legs,
      };
    }
  }

  const chainedPrimary = await buildChainedRoute(spots, primary, routeHooks);
  if (chainedPrimary.merged.length < 2) {
    const chainedSecondary = await buildChainedRoute(spots, secondary, routeHooks);
    if (chainedSecondary.merged.length < 2) {
      await flushRoutingUsage();
      return { ok: false, code: "EMPTY" };
    }
    await flushRoutingUsage();
    let kind: V5PlanRouteSuccess["kind"] = "chained-mixed";
    if (!chainedSecondary.anyStraight && surfaceOnly) {
      kind = secondary === "foot" ? "chained-foot" : "chained-driving";
    } else if (chainedSecondary.hasAirOrFerry) {
      kind = "chained-air";
    }
    return {
      ok: true,
      coordinates: chainedSecondary.merged,
      kind,
      legs: chainedSecondary.legs,
    };
  }

  await flushRoutingUsage();

  let kind: V5PlanRouteSuccess["kind"] = "chained-mixed";
  if (!chainedPrimary.anyStraight && surfaceOnly) {
    kind = primary === "foot" ? "chained-foot" : "chained-driving";
  } else if (chainedPrimary.hasAirOrFerry) {
    kind = "chained-air";
  }

  return {
    ok: true,
    coordinates: chainedPrimary.merged,
    kind,
    legs: chainedPrimary.legs,
  };
}
