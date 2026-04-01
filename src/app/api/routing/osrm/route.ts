import { consumeDirectionsRateLimit, getClientIpFromRequest } from "@/lib/routing/directions-api-guard.server";

const MAX_COORDS = 25;

/**
 * Walking / driving geometry via OSRM (no NAVER key). Rate-limited per IP (shared bucket key prefix with directions).
 * Intentionally **no** `DIRECTIONS_INTERNAL_SECRET` check: this route is called from client map editors with same-origin `fetch`.
 */
export async function POST(req: Request) {
  const ip = getClientIpFromRequest(req);
  if (!consumeDirectionsRateLimit(`dir:${ip}`)) {
    return Response.json(
      { error: "Too many requests", code: "DIRECTIONS_RATE_LIMIT" },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON", code: "DIRECTIONS_BAD_JSON" }, { status: 400 });
  }

  const coordinates = (body as { coordinates?: { lat: number; lng: number }[] }).coordinates;
  const profileRaw = (body as { profile?: string }).profile ?? "foot";
  if (!coordinates || coordinates.length < 2) {
    return Response.json(
      { error: "At least two coordinates required", code: "DIRECTIONS_INVALID" },
      { status: 400 },
    );
  }
  if (coordinates.length > MAX_COORDS) {
    return Response.json({ error: "Too many coordinates", code: "DIRECTIONS_INVALID" }, { status: 400 });
  }
  for (const c of coordinates) {
    if (typeof c.lat !== "number" || typeof c.lng !== "number" || !Number.isFinite(c.lat) || !Number.isFinite(c.lng)) {
      return Response.json({ error: "Invalid coordinate", code: "DIRECTIONS_INVALID" }, { status: 400 });
    }
  }

  const osrmProfile = profileRaw === "car" ? "driving" : "foot";
  const coordStr = coordinates.map((c) => `${c.lng},${c.lat}`).join(";");
  const base = process.env.OSRM_BASE_URL?.replace(/\/$/, "") ?? "https://router.project-osrm.org";
  const url = `${base}/route/v1/${osrmProfile}/${coordStr}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) {
      return Response.json(
        { error: "Routing provider HTTP error", status: res.status, code: "OSRM_HTTP" },
        { status: 502 },
      );
    }
    const data = (await res.json()) as {
      code?: string;
      message?: string;
      routes?: { geometry?: { coordinates?: [number, number][] }; distance?: number; duration?: number }[];
    };
    if (data.code !== "Ok" || !data.routes?.[0]) {
      return Response.json(
        { error: data.message ?? "No route returned", code: data.code ?? "OSRM_ROUTE_ERROR" },
        { status: 422 },
      );
    }
    const route = data.routes[0];
    const coords = route.geometry?.coordinates;
    if (!coords?.length) {
      return Response.json({ error: "Empty geometry", code: "DIRECTIONS_EMPTY" }, { status: 422 });
    }
    const path = coords.map(([lng, lat]) => ({ lat, lng }));
    return Response.json({
      path,
      distance_m: route.distance ?? null,
      duration_s: route.duration ?? null,
      provider: "osrm",
      profile: osrmProfile,
    });
  } catch (e) {
    console.error("[routing/osrm]", e);
    return Response.json({ error: "Routing request failed", code: "OSRM_FAILED" }, { status: 502 });
  }
}
