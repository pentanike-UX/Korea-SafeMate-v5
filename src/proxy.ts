import createMiddleware from "next-intl/middleware";
import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

async function refreshSupabaseSession(request: NextRequest, response: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll: ((cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }) satisfies SetAllCookies,
    },
  });

  await supabase.auth.getUser();
}

/** Next.js 16+: `middleware` convention renamed to `proxy` (same behavior at the edge). */
export default async function proxy(request: NextRequest) {
  const p = request.nextUrl.pathname;

  if (p.startsWith("/admin") || p.startsWith("/guardian")) {
    const res = NextResponse.next();
    await refreshSupabaseSession(request, res);
    return res;
  }

  if (p.startsWith("/auth")) {
    const res = NextResponse.next();
    await refreshSupabaseSession(request, res);
    return res;
  }

  const intlResponse = intlMiddleware(request);
  await refreshSupabaseSession(request, intlResponse);
  return intlResponse;
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
