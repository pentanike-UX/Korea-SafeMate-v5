import "server-only";

/** 오늘 기준 무료 플랜 일일 한도 (환경 변수로 조정) */
export function waylyUsageLimits(planTier: "free" | "plus" | "past_due" | "canceled") {
  const mult = planTier === "plus" ? readMult() : 1;
  return {
    geminiGenerationsPerDay: Math.max(1, readInt("WAYLY_FREE_GEMINI_GENERATIONS_PER_DAY", 40) * mult),
    routingLivePerDay: Math.max(1, readInt("WAYLY_FREE_ROUTING_LIVE_PER_DAY", 24) * mult),
    naverLivePerDay: Math.max(1, readInt("WAYLY_FREE_NAVER_LIVE_PER_DAY", 40) * mult),
  };
}

function readInt(key: string, fallback: number): number {
  const v = process.env[key]?.trim();
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function readMult(): number {
  const v = process.env.WAYLY_PLUS_LIMIT_MULTIPLIER?.trim();
  const n = v ? Number(v) : 5;
  return Number.isFinite(n) && n >= 1 ? n : 5;
}

export function normalizePlanTier(
  raw: string | null | undefined,
): "free" | "plus" | "past_due" | "canceled" {
  if (raw === "plus" || raw === "past_due" || raw === "canceled") return raw;
  return "free";
}
