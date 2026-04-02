/** /api/tour/spot 성공 시 클라이언트에 보관하는 필드 */
export interface SpotTourEnrichment {
  contentId: string;
  contentTypeId: string;
  title: string;
  imageUrl: string | null;
  displayImageUrl: string;
  overview: string | null;
}

export function tourSearchQuery(spot: { name: string }, region: string): string {
  return `${spot.name} ${region}`.replace(/\s+/g, " ").trim();
}

/** Next/Image 최적화가 깨지는 도메인·프로토콜 */
export function tourImageUnoptimized(url: string): boolean {
  return (
    url.startsWith("http://") ||
    url.includes("visitkorea.or.kr") ||
    url.includes("knto.or.kr")
  );
}
