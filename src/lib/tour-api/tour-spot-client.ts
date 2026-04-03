/** /api/tour/spot 성공 시 클라이언트에 보관하는 필드 */
export interface SpotTourEnrichment {
  contentId: string;
  contentTypeId: string;
  title: string;
  imageUrl: string | null;
  displayImageUrl: string;
  overview: string | null;
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
  spot: { name: string; type: TourSpotType | string },
  region: string,
): string {
  const q = tourSearchQuery(spot, region);
  const p = new URLSearchParams();
  p.set("q", q);
  p.set("spotType", spot.type);
  p.set("region", region);
  return p.toString();
}

export function tourSpotApiUrl(
  spot: { name: string; type: TourSpotType | string },
  region: string,
): string {
  return `/api/tour/spot?${tourSpotSearchParams(spot, region)}`;
}

/** Next/Image 최적화가 깨지는 도메인·프로토콜 */
export function tourImageUnoptimized(url: string): boolean {
  return (
    url.startsWith("http://") ||
    url.includes("visitkorea.or.kr") ||
    url.includes("knto.or.kr")
  );
}
