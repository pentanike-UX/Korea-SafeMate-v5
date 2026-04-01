import { listPublishedV4Routes } from "@/data/v4";
import { V4_SPOTS } from "@/data/v4/spots";
import { listPublishedV4Stories } from "@/data/v4/stories";

export type ExploreWorkspaceRoutes = { slug: string; title: string; summary: string }[];
export type ExploreWorkspaceSpots = { slug: string; name: string; shortDescription: string; vibeTags: string[] }[];
export type ExploreWorkspaceStories = { slug: string; title: string; deck: string }[];

export function buildExploreWorkspacePayload(): {
  routes: ExploreWorkspaceRoutes;
  spots: ExploreWorkspaceSpots;
  stories: ExploreWorkspaceStories;
} {
  const routes = listPublishedV4Routes().map((r) => ({ slug: r.slug, title: r.title, summary: r.summary }));
  const spots = V4_SPOTS.map((s) => ({
    slug: s.slug,
    name: s.name,
    shortDescription: s.shortDescription,
    vibeTags: s.vibeTags,
  }));
  const stories = listPublishedV4Stories().map((s) => ({ slug: s.slug, title: s.title, deck: s.deck }));
  return { routes, spots, stories };
}
