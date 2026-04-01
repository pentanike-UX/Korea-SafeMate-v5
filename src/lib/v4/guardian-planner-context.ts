import type { AIPlanOutput } from "@/domain/curated-experience";

export const GUARDIAN_PLANNER_CONTEXT_KEY = "safemate:guardianRequestContext";

export type GuardianPlannerContextPayload = {
  /** Present when user came from AI planner result. */
  plan?: AIPlanOutput;
  routeSlug: string;
  routeTitle: string;
  variant?: "primary" | "calmer" | "weather";
  savedAt?: number;
};

export function writeGuardianPlannerContext(payload: GuardianPlannerContextPayload) {
  try {
    sessionStorage.setItem(GUARDIAN_PLANNER_CONTEXT_KEY, JSON.stringify({ ...payload, savedAt: Date.now() }));
  } catch {
    /* ignore */
  }
}

export function readGuardianPlannerContext(): GuardianPlannerContextPayload | null {
  try {
    const raw = sessionStorage.getItem(GUARDIAN_PLANNER_CONTEXT_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as GuardianPlannerContextPayload;
    if (!v || typeof v.routeSlug !== "string") return null;
    return v;
  } catch {
    return null;
  }
}
