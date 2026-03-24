import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

/** Next.js 16+: `middleware` convention renamed to `proxy` (same behavior at the edge). */
export default function proxy(request: NextRequest) {
  const p = request.nextUrl.pathname;
  if (p.startsWith("/admin") || p.startsWith("/guardian")) {
    return NextResponse.next();
  }
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
