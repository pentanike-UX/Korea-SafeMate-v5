import type { MypagePointsApiResponse } from "@/lib/points/types";

export const CLIENT_POINTS_CACHE_TTL_MS = 35_000;

let clientPointsFetchCache: { userId: string; at: number; data: MypagePointsApiResponse } | null = null;

/** 로그아웃·계정 전환 등 — 캐시된 포인트 API 응답을 즉시 비웁니다. */
export function invalidateClientPointsCache(): void {
  clientPointsFetchCache = null;
}

export function clearClientPointsCacheIfUserMismatch(userId: string | null): void {
  if (!clientPointsFetchCache) return;
  if (!userId || clientPointsFetchCache.userId !== userId) {
    clientPointsFetchCache = null;
  }
}

export function getClientPointsFetchCache(userId: string): MypagePointsApiResponse | null {
  if (
    clientPointsFetchCache &&
    clientPointsFetchCache.userId === userId &&
    Date.now() - clientPointsFetchCache.at < CLIENT_POINTS_CACHE_TTL_MS
  ) {
    return clientPointsFetchCache.data;
  }
  return null;
}

export function setClientPointsFetchCache(userId: string, data: MypagePointsApiResponse): void {
  clientPointsFetchCache = { userId, at: Date.now(), data };
}
