import { listPublishedV4Routes } from "./routes";
import { V4_SPOTS } from "./spots";

export function getMockSavedRouteSlugs() {
  return listPublishedV4Routes().map((r) => r.slug);
}

export function getMockSavedSpotSlugs() {
  return V4_SPOTS.slice(0, 2).map((s) => s.slug);
}

export function getMockAiPlanSummaries() {
  return [
    { id: "demo-plan-1", summary: "Three-stop arc with wide paths after dark.", createdAt: "2026-03-28T12:00:00.000Z" },
    { id: "demo-plan-2", summary: "North–south balance for arrival day.", createdAt: "2026-03-30T09:30:00.000Z" },
  ];
}
