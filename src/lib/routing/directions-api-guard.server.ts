const bucket = new Map<string, { count: number; resetAt: number }>();

function rateLimitWindowMs(): number {
  return 60_000;
}

function rateLimitMax(): number {
  const n = Number(process.env.DIRECTIONS_RATE_LIMIT_PER_MINUTE ?? "40");
  return Number.isFinite(n) && n > 0 ? Math.min(500, Math.floor(n)) : 40;
}

/** When set, `POST /api/routing/directions` requires `Authorization: Bearer <value>` (OSRM route stays open + rate-limited for client editors). */
export function directionsInternalSecret(): string | null {
  const s = process.env.DIRECTIONS_INTERNAL_SECRET?.trim();
  return s || null;
}

export function verifyDirectionsBearer(req: Request): boolean {
  const secret = directionsInternalSecret();
  if (!secret) return true;
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  return auth.slice(7).trim() === secret;
}

export function getClientIpFromRequest(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim() || "unknown";
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export function getClientIpFromHeaders(h: { get(name: string): string | null }): string {
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim() || "unknown";
  return h.get("x-real-ip")?.trim() || "unknown";
}

/** Returns false when over limit (sliding-ish window per key). */
export function consumeDirectionsRateLimit(key: string): boolean {
  const max = rateLimitMax();
  const windowMs = rateLimitWindowMs();
  const now = Date.now();
  let row = bucket.get(key);
  if (!row || now > row.resetAt) {
    row = { count: 0, resetAt: now + windowMs };
    bucket.set(key, row);
  }
  row.count += 1;
  if (row.count > max) return false;
  if (bucket.size > 20_000) bucket.clear();
  return true;
}
