import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { stripLocaleFromPathname, withLocalePath } from "@/lib/auth/route-path";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((c) => {
    to.cookies.set(c.name, c.value);
  });
}

function isChatAppSurface(pathWithoutLocale: string): boolean {
  return (
    pathWithoutLocale === "/" ||
    pathWithoutLocale === "/chat" ||
    pathWithoutLocale.startsWith("/chat/") ||
    pathWithoutLocale === "/login" ||
    pathWithoutLocale.startsWith("/login/")
  );
}

/** Next.js 16+: `middleware` convention renamed to `proxy` (same behavior at the edge). */
export default async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const { locale, pathname: pathWo } = stripLocaleFromPathname(pathname);

  if (pathWo.startsWith("/api")) {
    if (pathname !== pathWo) {
      const url = request.nextUrl.clone();
      url.pathname = pathWo;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/auth")) {
    return NextResponse.next();
  }

  const intlResponse = intlMiddleware(request);

  if (!isChatAppSurface(pathWo)) {
    const target = new URL(withLocalePath(locale, "/chat"), request.url);
    const red = NextResponse.redirect(target);
    copyCookies(intlResponse, red);
    return red;
  }

  return intlResponse;
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
