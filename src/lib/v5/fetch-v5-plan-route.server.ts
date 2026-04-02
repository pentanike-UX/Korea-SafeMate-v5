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

const MAX_COORDS = 25;

/** 스팟 i → i+1 구간 (도로 기준, OSRM/네이버·캐시) */
export type V5PlanRouteLegSummary = {
  durationSeconds: number | null;
  distanceMeters: number | null;
};

export type V5PlanRouteSuccess = {
  ok: true;
  /** GeoJSON LineString coordinates: [lng, lat][] */
  coordinates: [number, number][];
  /** UI/디버그용 */
  kind: "full-foot" | "full-driving" | "chained-foot" | "chained-driving" | "chained-mixed";
  /** 스팟 순서대로 n-1개 구간의 이동 시간·거리 */
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

/** OSRM/네이버 구간을 이어 [lng,lat] 하나의 LineString으로 */
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
    if (typeof c.lat !== "number" || typeof c.lng !== "number" || !Number.isFinite(c.lat) || !Number.isFinite(c.lng)) {
      return { ok: false, code: "INVALID" };
    }
  }
  return null;
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
    });
  }
  return out;
}

async function tryLeg(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  primary: DirectionsProfile,
  hooks?: ResolveDirectionsHooks,
): Promise<{ path: [number, number][]; straight: boolean }> {
  const pair = [a, b];
  let data = await resolveDirections(pair, primary, hooks);
  if (!data?.path?.length || data.path.length < 2) {
    const alt: DirectionsProfile = primary === "foot" ? "driving" : "foot";
    data = await resolveDirections(pair, alt, hooks);
  }
  if (data?.path?.length && data.path.length >= 2) {
    return { path: data.path.map((p) => [p.lng, p.lat] as [number, number]), straight: false };
  }
  return {
    path: [
      [a.lng, a.lat],
      [b.lng, b.lat],
    ],
    straight: true,
  };
}

/**
 * 플랜 스팟 좌표 순서대로 실제 도로(도보/주행) 기준 경로를 만든다.
 * - `resolveDirections`: 다지점 OSRM, 2점+주행은 네이버 우선 가능.
 * - 한 사용자 액션당 rate limit 1회만 소모한 뒤 내부에서 여러 `resolveDirections` 호출(캐시 활용).
 * - 대중교통 레그는 별도 API가 없어 반영하지 않는다.
 */
export async function fetchV5PlanRouteGeometry(
  coordinates: { lat: number; lng: number }[],
): Promise<V5PlanRouteResult> {
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

  const pieces: [number, number][][] = [];
  let anyStraight = false;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const a = coordinates[i]!;
    const b = coordinates[i + 1]!;
    const leg = await tryLeg(a, b, primary, routeHooks);
    pieces.push(leg.path);
    if (leg.straight) anyStraight = true;
  }

  const merged = mergeLngLatPaths(pieces);
  if (merged.length < 2) {
    await flushRoutingUsage();
    return { ok: false, code: "EMPTY" };
  }

  let kind: V5PlanRouteSuccess["kind"] = "chained-mixed";
  if (!anyStraight) {
    kind = primary === "foot" ? "chained-foot" : "chained-driving";
  }

  const legs = await collectLegSummaries(coordinates, primary, routeHooks);

  await flushRoutingUsage();
  return { ok: true, coordinates: merged, kind, legs };
}
