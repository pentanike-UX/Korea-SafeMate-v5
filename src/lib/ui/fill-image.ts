/**
 * `next/image` + `fill` 조합용 공통 클래스.
 * 부모는 `relative` + `aspect-*` 또는 고정 크기 + `overflow-hidden` + `bg-muted` 권장.
 */
export const FILL_IMAGE_COVER_CENTER = "object-cover object-center";

/** 와이드 히어로(루트 포스트·일반 포스트 헤더) — 모바일에서 하늘/상단 피사체가 덜 잘리도록 약간 위쪽 기준 */
export const FILL_IMAGE_COVER_ROUTE_HERO = "object-cover object-[center_40%] sm:object-center";

/** 카드형 16:10 썸네일 — 모바일에서 상단·중앙 피사체 우선 */
export const FILL_IMAGE_COVER_CARD_16_10 = "object-cover object-[center_42%] sm:object-center";
