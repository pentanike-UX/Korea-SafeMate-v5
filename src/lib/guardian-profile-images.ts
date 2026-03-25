import type { GuardianProfile } from "@/types/domain";

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
 * 가디언별 동일 번호 세트: 기본 / 가로(히어로·배너) / 아바타(썸네일·헤더).
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
