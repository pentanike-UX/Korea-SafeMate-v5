/**
 * Canonical public origin for OAuth redirects and post-login navigation.
 *
 * Vercel: set `NEXT_PUBLIC_SITE_URL` on **Preview and Production** to the same production
 * hostname (e.g. https://korea-safe-mate-v3.vercel.app). If it is missing on a Preview
 * deploy, this module avoids using the preview `*.vercel.app` host for OAuth.
 */

/** Override via env for forks; default matches this project’s production Vercel host. */
function deployedOAuthFallbackOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_OAUTH_FALLBACK_ORIGIN?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "https://korea-safe-mate-v3.vercel.app";
}

export function getCanonicalSiteOrigin(): string | undefined {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.NEXT_PUBLIC_OAUTH_REDIRECT_ORIGIN?.trim();
  if (!raw) return undefined;
  return raw.replace(/\/$/, "");
}

/**
 * Browser — `signInWithOAuth` `redirectTo` origin. Never uses preview deployment hostname
 * when `NEXT_PUBLIC_SITE_URL` is unset (falls back to production canonical).
 */
export function getOAuthRedirectOriginForClient(): string {
  const fromEnv = getCanonicalSiteOrigin();
  if (fromEnv) return fromEnv;
  if (typeof window === "undefined") {
    return deployedOAuthFallbackOrigin();
  }
  const { hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return window.location.origin;
  }
  return deployedOAuthFallbackOrigin();
}

/**
 * Callback route — final redirect base after `exchangeCodeForSession`.
 * On Vercel Preview, avoids `x-forwarded-host` (preview URL) when env canonical is unset.
 */
export function resolveOAuthRedirectBase(request: Request): string {
  const canonical = getCanonicalSiteOrigin();
  if (canonical) return canonical;

  if (process.env.VERCEL === "1") {
    const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
    if (vercelProd) {
      return vercelProd.startsWith("http") ? vercelProd.replace(/\/$/, "") : `https://${vercelProd}`;
    }
    return deployedOAuthFallbackOrigin();
  }

  const { origin } = new URL(request.url);
  if (process.env.NODE_ENV === "development") {
    return origin;
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    return `https://${forwardedHost}`;
  }
  return origin;
}
