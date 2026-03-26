/**
 * 가디언 표시 이름 단일 소스 — `mg01`…`mg15` ↔ 프로필 이미지 인덱스(profile_XX)와 1:1.
 * 이미지로 성별을 추정하지 않고, 중성적·자연스러운 한글 이름으로 통일합니다.
 * 수정 시 이 객체만 편집하면 시드 프로필·포스트 작성자명에 반영됩니다.
 */
export const GUARDIAN_DISPLAY_NAME_BY_USER_ID: Record<string, string> = {
  mg01: "해온",
  mg02: "새결",
  mg03: "다옴",
  mg04: "이든",
  mg05: "아람",
  mg06: "하람",
  mg07: "세아",
  mg08: "유담",
  mg09: "누리",
  mg10: "새빛",
  mg11: "태이",
  mg12: "채이",
  mg13: "기움",
  mg14: "서이",
  mg15: "도담",
};

export function resolveGuardianDisplayName(userId: string, legacyFallback?: string): string {
  const mapped = GUARDIAN_DISPLAY_NAME_BY_USER_ID[userId];
  if (mapped) return mapped;
  return legacyFallback?.trim() || userId;
}
