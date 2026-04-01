import { listPublishedV4Routes } from "@/data/v4";
import { HomeMapPrimaryClient } from "@/components/home/home-map-primary-client";

export async function HomeV4Page() {
  const routes = listPublishedV4Routes().slice(0, 3);
  const featuredRoutes = routes.map((r) => ({ slug: r.slug, title: r.title }));
  return <HomeMapPrimaryClient featuredRoutes={featuredRoutes} />;
}
