/**
 * 홈 하단 듀얼 CTA 인물 컷.
 * 운영 시 `/public/images/home/` 정적 파일로 바꾸려면 이 URL을 교체하면 됩니다.
 */
export const HOME_CTA_IMAGES = {
  /** 여행자 배너 — 단정한 남성 프로필 톤 (교체: 동일 키에 로컬 `/images/home/...` 지정 가능) */
  travelerPortrait:
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=960&q=82",
  /** 가디언 지원 배너 — 단정한 여성 프로필 톤 */
  guardianPortrait:
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=960&q=82",
} as const;
