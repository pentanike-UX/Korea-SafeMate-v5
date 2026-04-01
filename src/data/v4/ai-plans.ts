import type { AIPlanOutput, AIPlannerInput } from "@/domain/curated-experience";
import { getV4RouteBySlug } from "@/data/v4/routes";

/** Deterministic mock: hash-ish from string for stable demo IDs */
function shortId(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return `plan-${Math.abs(h).toString(36)}`;
}

export function buildMockAIPlan(inputs: AIPlannerInput): AIPlanOutput {
  const key = JSON.stringify(inputs);
  const eveningLate =
    inputs.timeBudget === "full_evening" ||
    inputs.vibe === "calm" ||
    inputs.timeOfDay === "evening" ||
    inputs.timeOfDay === "late_night";
  const primarySlug = eveningLate ? "quiet-late-gangnam-corridor" : "first-night-seoul-north-south";
  const altSlug = primarySlug === "quiet-late-gangnam-corridor" ? "first-night-seoul-north-south" : "quiet-late-gangnam-corridor";
  const primaryRoute = getV4RouteBySlug(primarySlug);

  return {
    id: shortId(key),
    inputs,
    routeId: primaryRoute?.id ?? "route-unknown",
    outputSummary:
      inputs.companions === "solo" && inputs.safetySensitive === "high"
        ? "A three-stop arc with wide paths after dark and minimal transfers."
        : "A paced sequence: seated calm → structured browse → optional open-air finish.",
    routesSuggested: [primarySlug, altSlug],
    rationale:
      inputs.weatherSensitive
        ? "Indoor-heavy middle; river segment marked optional if conditions shift."
        : "Ordered to reduce decision points when energy is uncertain—each stop has a clear ‘done’ signal.",
    expectedMood: inputs.vibe === "romantic" ? "Close, quiet, legible" : inputs.vibe === "lively" ? "Warm, social edges without bar strips" : "Unhurried, clear-eyed",
    timingTips: [
      "Start stop 1 within 45 minutes of your intended ‘out the door’ time.",
      "If behind schedule, skip the last stop—the route still resolves.",
    ],
    cautions:
      inputs.safetySensitive === "high"
        ? ["Avoid shortcut alleys between stops 1–2; stay on main lit corridors."]
        : ["Weekend nights near nightlife districts add 10–15 minutes—buffer transfers."],
    alternativeRouteSlug: altSlug,
    createdAt: new Date().toISOString(),
  };
}
