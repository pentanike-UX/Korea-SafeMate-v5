"use server";

import { headers } from "next/headers";
import type { DirectionsProfile, DirectionsRequestBody, NormalizedDirections } from "@/lib/routing/directions-types";
import { consumeDirectionsRateLimit, getClientIpFromHeaders } from "@/lib/routing/directions-api-guard.server";
import { resolveDirections } from "@/lib/routing/resolve-directions.server";

const MAX_COORDS = 25;

export type DirectionsFailureCode = "INVALID" | "RATE_LIMIT" | "EMPTY" | "FAILED";

export type DirectionsRequestResult =
  | { ok: true; data: NormalizedDirections }
  | { ok: false; code: DirectionsFailureCode };

/** Maps action failure codes to `V4.routeMap.states.*` keys. */
export function directionsFailureStateKey(code: DirectionsFailureCode): string {
  switch (code) {
    case "RATE_LIMIT":
      return "dirRateLimit";
    case "INVALID":
      return "dirInvalid";
    case "EMPTY":
      return "dirEmpty";
    case "FAILED":
      return "dirFailed";
  }
}

function validateBody(body: DirectionsRequestBody): string | null {
  const coordinates = body.coordinates;
  if (!coordinates || coordinates.length < 2) return "At least two coordinates required";
  if (coordinates.length > MAX_COORDS) return "Too many coordinates";
  for (const c of coordinates) {
    if (typeof c.lat !== "number" || typeof c.lng !== "number" || !Number.isFinite(c.lat) || !Number.isFinite(c.lng)) {
      return "Invalid coordinate";
    }
  }
  return null;
}

/**
 * Preferred path from Client Components: runs on the server (no browser → `/api` round-trip, no Bearer in the client).
 * Still subject to per-IP rate limits (shared bucket with the HTTP route).
 */
export async function requestDirections(body: DirectionsRequestBody): Promise<DirectionsRequestResult> {
  const invalid = validateBody(body);
  if (invalid) return { ok: false, code: "INVALID" };

  const h = await headers();
  const ip = getClientIpFromHeaders(h);
  if (!consumeDirectionsRateLimit(`dir:${ip}`)) {
    return { ok: false, code: "RATE_LIMIT" };
  }

  const profile: DirectionsProfile = body.profile === "driving" ? "driving" : "foot";
  try {
    const data = await resolveDirections(body.coordinates!, profile);
    if (!data?.path?.length) {
      return { ok: false, code: "EMPTY" };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, code: "FAILED" };
  }
}
