import type { ContentPost, ContentPostFormat, MapLatLng, RouteJourney, RouteSpot } from "@/types/domain";
import { resolveEnrichedPostVisuals, resolveEnrichedSpotVisual } from "@/lib/post-visual-enrichment";

export function getContentPostFormat(post: ContentPost): ContentPostFormat {
  return post.post_format ?? "article";
}

export function postHasRouteJourney(post: ContentPost): boolean {
  return Boolean(post.route_journey && post.route_journey.spots.length > 0);
}

export function isRouteLikeFormat(format: ContentPostFormat): boolean {
  return format === "spot" || format === "route" || format === "hybrid";
}

export function routeJourneyPoints(journey: RouteJourney): MapLatLng[] {
  const fromPath = journey.path?.length ? journey.path : [];
  if (fromPath.length >= 2) return fromPath;
  return journey.spots.map((s) => ({ lat: s.lat, lng: s.lng }));
}

/** True when the post has an uploaded/assigned cover or any spot still. */
export function postHasOwnVisualMedia(post: ContentPost): boolean {
  if (post.cover_image_url?.trim()) return true;
  return Boolean(post.route_journey?.spots.some((s) => s.image_urls.some((x) => x?.trim())));
}

/** Cover or first spot image only — no automatic enrichment. */
export function postCoverImageUrl(post: ContentPost): string | null {
  const c = post.cover_image_url?.trim();
  if (c) return c;
  const first = post.route_journey?.spots.find((s) => s.image_urls.find((x) => x?.trim()))?.image_urls.find((x) => x?.trim());
  return first?.trim() ?? null;
}

/** Hero for cards and headers: own media, else keyword-enriched curated stills. */
export function getPostHeroImageUrl(post: ContentPost): string {
  const own = postCoverImageUrl(post);
  if (own) return own;
  return resolveEnrichedPostVisuals(post).heroUrl;
}

/** Second still when enriching (e.g. cafe exterior + interior); undefined if post has own media. */
export function getPostSecondaryImageUrl(post: ContentPost): string | undefined {
  if (postHasOwnVisualMedia(post)) return undefined;
  return resolveEnrichedPostVisuals(post).secondaryUrl;
}

export function getPostHeroImageAlt(post: ContentPost): string {
  if (postCoverImageUrl(post)) return post.title;
  return resolveEnrichedPostVisuals(post).alt;
}

export function getPostSecondaryImageAlt(post: ContentPost): string | undefined {
  if (postHasOwnVisualMedia(post)) return undefined;
  const v = resolveEnrichedPostVisuals(post);
  return v.altSecondary;
}

/** Spot gallery: first upload, else text-aligned enrichment for that stop. */
export function getSpotDisplayImageUrl(spot: RouteSpot, post: ContentPost): string {
  const u = spot.image_urls.find((x) => x?.trim());
  if (u) return u.trim();
  return resolveEnrichedSpotVisual(spot, post).heroUrl;
}

export function getSpotDisplayImageAlt(spot: RouteSpot, post: ContentPost): string {
  const u = spot.image_urls.find((x) => x?.trim());
  if (u) return `${spot.title} — ${spot.place_name}`;
  return resolveEnrichedSpotVisual(spot, post).alt;
}

/** For analytics / QA: posts that rely on enrichment (no cover and no spot uploads). */
export function countPostsWithoutOwnMedia(posts: ContentPost[]): number {
  return posts.filter((p) => !postHasOwnVisualMedia(p)).length;
}
