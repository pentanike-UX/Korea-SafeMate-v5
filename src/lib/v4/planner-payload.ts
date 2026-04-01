import type { AIPlannerInput, TimeOfDay, TransportMode } from "@/domain/curated-experience";

const VALID_TRANSPORT: TransportMode[] = ["walk", "transit", "taxi", "mixed"];

/** Coerce partial / legacy JSON into a complete planner input. */
export function normalizePlannerPayload(parsed: unknown): AIPlannerInput | null {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const p = parsed as Partial<AIPlannerInput>;

  const companions =
    p.companions === "solo" || p.companions === "couple" || p.companions === "friends" || p.companions === "family"
      ? p.companions
      : "solo";

  const timeBudget =
    p.timeBudget === "90m" || p.timeBudget === "half_day" || p.timeBudget === "full_evening" ? p.timeBudget : "half_day";

  const timeOfDay: TimeOfDay | "flex" =
    p.timeOfDay === "morning" ||
    p.timeOfDay === "afternoon" ||
    p.timeOfDay === "evening" ||
    p.timeOfDay === "late_night" ||
    p.timeOfDay === "flex"
      ? p.timeOfDay
      : "flex";

  const vibe =
    p.vibe === "calm" || p.vibe === "lively" || p.vibe === "romantic" || p.vibe === "focused" ? p.vibe : "calm";
  const budget = p.budget === "low" || p.budget === "medium" || p.budget === "high" ? p.budget : "medium";
  const energy = p.energy === "light" || p.energy === "moderate" || p.energy === "high" ? p.energy : "moderate";

  let transport: TransportMode[] = ["walk"];
  if (Array.isArray(p.transport)) {
    const next = p.transport.filter((x): x is TransportMode => VALID_TRANSPORT.includes(x as TransportMode));
    if (next.length) transport = next;
  }

  const weatherSensitive = Boolean(p.weatherSensitive);
  const safetySensitive =
    p.safetySensitive === "low" || p.safetySensitive === "medium" || p.safetySensitive === "high"
      ? p.safetySensitive
      : "medium";

  const languageComfort =
    p.languageComfort === "english" || p.languageComfort === "korean" || p.languageComfort === "mixed"
      ? p.languageComfort
      : "english";

  const areaHint = typeof p.areaHint === "string" && p.areaHint.trim() ? p.areaHint.trim() : undefined;

  return {
    companions,
    timeBudget,
    timeOfDay,
    vibe,
    budget,
    energy,
    transport,
    weatherSensitive,
    safetySensitive,
    languageComfort,
    areaHint,
  };
}

/** Server-safe decode (Next.js RSC / route handlers). */
export function decodePlannerPayload(raw: string | undefined): AIPlannerInput | null {
  if (!raw) return null;
  let json: string;
  try {
    json = Buffer.from(raw, "base64url").toString("utf8");
  } catch {
    try {
      json = Buffer.from(raw, "base64").toString("utf8");
    } catch {
      return null;
    }
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  return normalizePlannerPayload(parsed);
}
