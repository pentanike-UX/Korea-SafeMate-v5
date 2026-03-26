import type { GuardianProfile } from "@/types/domain";

/**
 * `object-cover`와 함께 쓰세요. 모바일에서 카드 미디어 박스가 낮아질 때 중앙 크롭 대신 상단(얼굴) 우선.
 * `sm` 이상에서는 세로형·와이드 레이아웃에 맞게 중앙으로 복귀.
 */
export const GUARDIAN_PROFILE_COVER_POSITION_CLASS = "object-cover object-top sm:object-center";

/**
 * 시드·프로필 경로에서 01–15 인덱스를 추출합니다. (`mg01` / `profile_03.jpg` 등)
 */
export function parseProfileImageIndex(g: Pick<GuardianProfile, "user_id" | "photo_url">): number | null {
  const mg = g.user_id.match(/^mg(\d{2})$/i);
  if (mg) {
    const n = parseInt(mg[1]!, 10);
    if (n >= 1 && n <= 99) return n;
  }
  const raw = g.photo_url?.trim();
  if (!raw) return null;
  const m =
    raw.match(/profile_(\d{2})_(?:landscape|avatar)\.jpg$/i) ?? raw.match(/profile_(\d{2})\.jpg$/i);
  if (m) {
    const n = parseInt(m[1]!, 10);
    if (n >= 1 && n <= 99) return n;
  }
  return null;
}

export function guardianProfileImageUrlsFromIndex(index: number): {
  default: string;
  landscape: string;
  avatar: string;
} {
  const clamped = Math.min(99, Math.max(1, Math.floor(index)));
  const n = String(clamped).padStart(2, "0");
  return {
    default: `/mock/profiles/profile_${n}.jpg`,
    landscape: `/mock/profiles/profile_${n}_landscape.jpg`,
    avatar: `/mock/profiles/profile_${n}_avatar.jpg`,
  };
}

/**
 * 가디언별 동일 번호 세트:
 * - `default` (profile_XX.jpg): 세로 비율 — /guardians 목록의 큰 카드 썸네일 등
 * - `landscape` (profile_XX_landscape.jpg): 가로 배너 — 상세(/guardians/[id]) 히어로 등
 * - `avatar` (profile_XX_avatar.jpg): 정사각형 — 상세 원형 아바타·작은 프로필 등
 * 인덱스를 알 수 없으면 `photo_url`로 세 타입에 동일 폴백.
 */
export function guardianProfileImageUrls(g: Pick<GuardianProfile, "user_id" | "photo_url">): {
  default: string;
  landscape: string;
  avatar: string;
} {
  const idx = parseProfileImageIndex(g);
  if (idx == null) {
    const fb = g.photo_url?.trim() || "";
    return { default: fb, landscape: fb, avatar: fb };
  }
  return guardianProfileImageUrlsFromIndex(idx);
}
