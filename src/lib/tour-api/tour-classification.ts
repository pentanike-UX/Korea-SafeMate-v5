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
 * - food / cafe: 대분류 FD만 적용. cafe에 FD05 중분류를 걸면 체험카페·관광지 내 카페 등이
 *   누락되어 매칭 실패율이 높아지므로 대분류만 사용하고 완화 재시도 횟수를 줄임.
 * - hotel: AC 대분류.
 * - attraction / transport: 관광정보가 여러 대분류에 걸쳐 필터 없음.
 */
export function tourLclsForSpotKind(kind: TourSpotKind): TourLclsFilter | null {
  switch (kind) {
    case "food":
    case "cafe":
      return { lclsSystm1: "FD" };
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
