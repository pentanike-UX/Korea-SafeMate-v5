import type { LaunchAreaSlug } from "@/types/launch-area";

export type ExploreFitLineKey =
  | "fitLineKpop"
  | "fitLineGwanghwamun"
  | "fitLineFirstVisit"
  | "fitLinePhoto"
  | "fitLineWalking";

type Pace = "calm" | "balanced" | "packed";

/**
 * 추천 결과 카드 한 줄 이유 — 문구 풀을 조건에 맞게 쌓고, 카드 순번으로 순환해 다양하게 보이게 한다.
 */
export function exploreGuardianFitLineKeys(
  region: LaunchAreaSlug | "",
  theme: string,
  pace: Pace,
): ExploreFitLineKey[] {
  const keys: ExploreFitLineKey[] = [];
  if (theme === "k_pop_day") keys.push("fitLineKpop");
  if (region === "gwanghwamun") keys.push("fitLineGwanghwamun");
  if (theme === "photo_route") keys.push("fitLinePhoto");
  if (pace === "calm" || theme === "safe_solo") keys.push("fitLineFirstVisit");
  keys.push("fitLineWalking");
  return [...new Set(keys)];
}

export function exploreGuardianFitLineKeyAtIndex(
  region: LaunchAreaSlug | "",
  theme: string,
  pace: Pace,
  index: number,
): ExploreFitLineKey {
  const list = exploreGuardianFitLineKeys(region, theme, pace);
  return list[index % list.length]!;
}
