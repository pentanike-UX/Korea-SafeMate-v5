/** /api/tour/spot 성공 시 클라이언트에 보관하는 필드 */
export interface SpotTourEnrichment {
  contentId: string;
  contentTypeId: string;
  title: string;
  imageUrl: string | null;
  displayImageUrl: string;
  overview: string | null;
  /** Tour 검색 행 좌표(WGS84). 있으면 지도·라우팅에 플랜 좌표 대신 사용 가능 */
  matchedLat: number | null;
  matchedLng: number | null;
  /** 플랜 스팟명과 검색 제목 일치가 충분한지 */
  alignsWithPlanName: boolean;
}

/** travelPlanSchema.spot.type 과 동일 */
export type TourSpotType = "attraction" | "food" | "cafe" | "transport" | "hotel";

export function tourSearchQuery(spot: { name: string }, region: string): string {
  return `${spot.name} ${region}`.replace(/\s+/g, " ").trim();
}

/**
 * TourAPI 정밀 필터용 쿼리스트링 (분류체계 lcls·법정동 ldong — 서버에서 해석)
 */
export function tourSpotSearchParams(
  spot: {
    name: string;
    type: TourSpotType | string;
    lat?: number | null;
    lng?: number | null;
  },
  region: string,
): string {
  const q = tourSearchQuery(spot, region);
  const p = new URLSearchParams();
  p.set("q", q);
  p.set("spotType", String(spot.type));
  p.set("region", region);
  p.set("matchName", spot.name);
  if (
    spot.lat != null &&
    spot.lng != null &&
    Number.isFinite(spot.lat) &&
    Number.isFinite(spot.lng)
  ) {
    p.set("refLat", String(spot.lat));
    p.set("refLng", String(spot.lng));
  }
  return p.toString();
}

export function tourSpotApiUrl(
  spot: {
    name: string;
    type: TourSpotType | string;
    lat?: number | null;
    lng?: number | null;
  },
  region: string,
): string {
  return `/api/tour/spot?${tourSpotSearchParams(spot, region)}`;
}

function spotHasFiniteLatLng(s: { lat?: number | null; lng?: number | null }): boolean {
  return (
    s.lat != null &&
    s.lng != null &&
    Number.isFinite(s.lat) &&
    Number.isFinite(s.lng)
  );
}

/**
 * Tour 검색 행 좌표로 플랜 좌표 보정.
 * - 일치 판정(alignsWithPlanName)이 나면 LLM 좌표를 Tour로 교체.
 * - 플랜에 좌표가 없을 때만, 일치 여부와 관계없이 Tour 좌표로 지도를 열 수 있게 함(덮어쓰기는 안 함).
 */
export function mergePlanWithTourCoords<
  T extends {
    spots: Array<{ id: string; lat?: number | null; lng?: number | null }>;
  },
>(plan: T, tourBySpotId: Record<string, SpotTourEnrichment | "err" | undefined>): T {
  return {
    ...plan,
    spots: plan.spots.map((s) => {
      const t = tourBySpotId[s.id];
      if (
        !t ||
        t === "err" ||
        t.matchedLat == null ||
        t.matchedLng == null ||
        !Number.isFinite(t.matchedLat) ||
        !Number.isFinite(t.matchedLng)
      ) {
        return { ...s };
      }
      if (t.alignsWithPlanName) {
        return { ...s, lat: t.matchedLat, lng: t.matchedLng };
      }
      if (!spotHasFiniteLatLng(s)) {
        return { ...s, lat: t.matchedLat, lng: t.matchedLng };
      }
      return { ...s };
    }),
  };
}

/** 지도 버튼 활성: 플랜 좌표 또는 Tour 매칭 좌표 */
export function planHasAnyMapCoords(
  plan: { spots: Array<{ id: string; lat?: number | null; lng?: number | null }> },
  tourBySpotId: Record<string, SpotTourEnrichment | "err" | undefined>,
): boolean {
  return plan.spots.some((s) => {
    if (spotHasFiniteLatLng(s)) return true;
    const t = tourBySpotId[s.id];
    return Boolean(
      t &&
        t !== "err" &&
        t.matchedLat != null &&
        t.matchedLng != null &&
        Number.isFinite(t.matchedLat) &&
        Number.isFinite(t.matchedLng),
    );
  });
}

/** Next/Image 최적화가 깨지는 도메인·프로토콜 */
export function tourImageUnoptimized(url: string): boolean {
  return (
    url.startsWith("http://") ||
    url.includes("visitkorea.or.kr") ||
    url.includes("knto.or.kr")
  );
}

/** KorService2에 이미지가 없을 때 쓰는 Unsplash — 모든 스팟 히어로 폴백으로 쓰면 동일 사진이 반복됨 */
export const TOUR_SPOT_PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80&auto=format&fit=crop";

const PLACEHOLDER_PHOTO_ID = "photo-1488646953014";

/** displayImageUrl이 위 플레이스홀더(쿼리만 다른 변형 포함)인지 */
export function tourSpotIsPlaceholderDisplayUrl(url: string | null | undefined): boolean {
  if (url == null || url === "") return false;
  return url.includes(PLACEHOLDER_PHOTO_ID);
}
