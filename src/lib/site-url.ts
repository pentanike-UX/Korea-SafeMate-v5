/**
 * Canonical public origin for OAuth redirects and post-login navigation.
 * Set `NEXT_PUBLIC_SITE_URL` on Vercel (e.g. https://korea-safe-mate-v3.vercel.app) so
 * logins started from a deployment hostname still return to the production URL.
 */
export function getCanonicalSiteOrigin(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return undefined;
  return raw.replace(/\/$/, "");
}
