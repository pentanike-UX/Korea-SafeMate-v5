import type { GuardianProfile } from "@/types/domain";

/**
 * `object-cover`와 함께 쓰세요. 모바일에서 카드 미디어 박스가 낮아질 때 중앙 크롭 대신 상단(얼굴) 우선.
 * `sm` 이상에서는 세로형·와이드 레이아웃에 맞게 중앙으로 복귀.
 */
export const GUARDIAN_PROFILE_COVER_POSITION_CLASS = "object-cover object-top sm:object-center";

export type GuardianImageSource = Pick<GuardianProfile, "user_id" | "photo_url"> & {
  avatar_image_url?: string | null;
  list_card_image_url?: string | null;
  detail_hero_image_url?: string | null;
};

function trimUrl(s: string | null | undefined): string {
  const t = s?.trim();
  return t || "";
}

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

function seedUrls(g: Pick<GuardianProfile, "user_id" | "photo_url">): {
  default: string;
  landscape: string;
  avatar: string;
} {
  const idx = parseProfileImageIndex(g);
  if (idx == null) {
    const fb = trimUrl(g.photo_url);
    return { default: fb, landscape: fb, avatar: fb };
  }
  return guardianProfileImageUrlsFromIndex(idx);
}

/**
 * 공개·목록·상세에서 쓰는 3종 URL.
 * - `default`: 목록 카드(비교형) 주 이미지
 * - `landscape`: 상세 히어로
 * - `avatar`: 원형·작은 프로필
 *
 * Fallback (요청 스펙):
 * - avatar: 아바타 전용 → 시드/photo 기반 아바타
 * - default: 목록 전용 → 상세 히어로 → 시드 기본
 * - landscape: 상세 전용 → 목록 → photo/시드
 */
export function guardianProfileImageUrls(g: GuardianImageSource): {
  default: string;
  landscape: string;
  avatar: string;
} {
  const seed = seedUrls(g);
  const listExplicit = trimUrl(g.list_card_image_url);
  const detailExplicit = trimUrl(g.detail_hero_image_url);
  const avatarExplicit = trimUrl(g.avatar_image_url);
  const legacyPhoto = trimUrl(g.photo_url);

  const avatar = avatarExplicit || seed.avatar;

  const listCard =
    listExplicit || detailExplicit || legacyPhoto || seed.default;

  const landscape =
    detailExplicit || listExplicit || legacyPhoto || seed.landscape;

  return {
    default: listCard,
    landscape,
    avatar,
  };
}
