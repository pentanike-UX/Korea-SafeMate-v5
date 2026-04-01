import { resolveDirections } from "@/lib/routing/resolve-directions.server";
import {
  consumeDirectionsRateLimit,
  getClientIpFromRequest,
  verifyDirectionsBearer,
} from "@/lib/routing/directions-api-guard.server";
import type { DirectionsProfile, DirectionsRequestBody } from "@/lib/routing/directions-types";

const MAX_COORDS = 25;

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
 * Unified directions: **NAVER Directions 5** (driving, two points) when
 * `NCP_MAP_API_KEY_ID` + `NCP_MAP_API_KEY` are set (legacy: `NAVER_MAP_CLIENT_ID` / `NAVER_MAP_CLIENT_SECRET`);
 * otherwise **OSRM** (foot/driving, multi-point).
 *
 * When `DIRECTIONS_INTERNAL_SECRET` is set, callers must send `Authorization: Bearer <secret>`.
 * Prefer `requestDirections` server action from the app UI (no secret in the browser).
 */
export async function POST(req: Request) {
  if (!verifyDirectionsBearer(req)) {
    return Response.json(
      { error: "Unauthorized", code: "DIRECTIONS_UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const ip = getClientIpFromRequest(req);
  if (!consumeDirectionsRateLimit(`dir:${ip}`)) {
    return Response.json(
      { error: "Too many requests", code: "DIRECTIONS_RATE_LIMIT" },
      { status: 429 },
    );
  }

  let body: DirectionsRequestBody;
  try {
    body = (await req.json()) as DirectionsRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON", code: "DIRECTIONS_BAD_JSON" }, { status: 400 });
  }

  const validationError = validateBody(body);
  if (validationError) {
    return Response.json({ error: validationError, code: "DIRECTIONS_INVALID" }, { status: 400 });
  }

  const coordinates = body.coordinates!;
  const profile: DirectionsProfile = body.profile === "driving" ? "driving" : "foot";

  try {
    const result = await resolveDirections(coordinates, profile);
    if (!result) {
      return Response.json({ error: "No route returned", code: "DIRECTIONS_EMPTY" }, { status: 422 });
    }
    return Response.json(result);
  } catch (e) {
    console.error("[api/routing/directions]", e);
    return Response.json(
      { error: "Directions request failed", code: "DIRECTIONS_FAILED" },
      { status: 502 },
    );
  }
}
