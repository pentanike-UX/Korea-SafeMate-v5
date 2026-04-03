/**
 * 앱 스팟 타입 ↔ TourAPI 키워드검색(searchKeyword2) 분류체계(lclsSystm*)
 * 관광타입(contentTypeId) 요청 파라미터는 v4.3에서 제거되어, 타입 제한은 분류체계 코드로만 가능.
 * 코드 값은 한국관광공사 신분류체계·관광타입 연계 정의서(대분류/중분류) 기준.
 */

export type TourSpotKind = "attraction" | "food" | "cafe" | "transport" | "hotel";

export type TourLclsFilter = {
  lclsSystm1: string;
  lclsSystm2?: string;
  lclsSystm3?: string;
};

/**
 * 키워드 검색에 넣을 분류 필터.
 * - food / cafe / hotel: 명확한 대·중분류로 오탐(다른 타입 1건) 감소.
 * - attraction / transport: 관광정보가 여러 대분류(자연·역사·레저 등)에 걸쳐 필터를 걸면 누락이 커져 필터 없음.
 */
export function tourLclsForSpotKind(kind: TourSpotKind): TourLclsFilter | null {
  switch (kind) {
    case "food":
      return { lclsSystm1: "FD" };
    case "cafe":
      return { lclsSystm1: "FD", lclsSystm2: "FD05" };
    case "hotel":
      return { lclsSystm1: "AC" };
    case "attraction":
    case "transport":
    default:
      return null;
  }
}

export function isTourSpotKind(s: string): s is TourSpotKind {
  return (
    s === "attraction" ||
    s === "food" ||
    s === "cafe" ||
    s === "transport" ||
    s === "hotel"
  );
}
