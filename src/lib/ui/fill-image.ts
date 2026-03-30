/**
 * `next/image` + `fill` 용 공통 클래스.
 * 부모는 `relative` + `aspect-*` 또는 고정 크기 + `overflow-hidden` + `bg-muted` 권장.
 * Next가 absolute/inset을 주더라도 `h-full w-full`로 영역을 명시해 커버가 빈틈 없이 맞도록 한다.
 */
const FILL_SIZE = "h-full w-full";

/** 표준 중앙 cover (에디터·어드민 미리보기, 일반 썸네일) */
export const FILL_IMAGE_COVER_CENTER = `${FILL_SIZE} object-cover object-center`;

/**
 * 와이드 히어로 — 포스트 상세·루트 상세·가디언 프로필 히어로 공통.
 * 모바일에서 하늘/상단 피사체가 덜 잘리도록 약간 위쪽 기준.
 */
export const FILL_IMAGE_COVER_HERO = `${FILL_SIZE} object-cover object-[center_40%] sm:object-center`;

/** @deprecated `FILL_IMAGE_COVER_HERO`와 동일. 기존 import 호환용. */
export const FILL_IMAGE_COVER_ROUTE_HERO = FILL_IMAGE_COVER_HERO;

/** 카드형 16:10 — 모바일에서 상단·중앙 피사체 우선 */
export const FILL_IMAGE_COVER_CARD_16_10 = `${FILL_SIZE} object-cover object-[center_42%] sm:object-center`;
