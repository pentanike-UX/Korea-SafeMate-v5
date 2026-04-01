import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { ExploreWorkspaceClient } from "@/components/explore/explore-workspace-client";
import { mockRegions } from "@/data/mock";
import { listPublishedV4Routes } from "@/data/v4";
import { BRAND } from "@/lib/constants";
import { buildExploreWorkspacePayload } from "@/lib/v4/explore-workspace-payload";

type Props = { params: Promise<{ region: string }> };

export function generateStaticParams() {
  return mockRegions.map((r) => ({ region: r.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { region } = await params;
  const r = mockRegions.find((x) => x.slug === region);
  const t = await getTranslations("Explore");
  return {
    title: r ? `${r.name} · ${t("metaTitle")} | ${BRAND.name}` : `Region | ${BRAND.name}`,
  };
}

function routesForRegionSlug(regionSlug: string) {
  const all = listPublishedV4Routes();
  if (regionSlug === "seoul") return all.filter((x) => x.city === "Seoul");
  if (regionSlug === "busan") return all.filter((x) => x.city.toLowerCase().includes("busan"));
  if (regionSlug === "jeju") return all.filter((x) => x.city.toLowerCase().includes("jeju"));
  return all;
}

export default async function ExploreRegionPage({ params }: Props) {
  const { region } = await params;
  const meta = mockRegions.find((r) => r.slug === region);
  if (!meta) notFound();

  const { spots, stories } = buildExploreWorkspacePayload();
  const routes = routesForRegionSlug(region).map((r) => ({ slug: r.slug, title: r.title, summary: r.summary }));

  return (
    <ExploreWorkspaceClient
      routes={routes.length ? routes : buildExploreWorkspacePayload().routes}
      spots={spots}
      stories={stories}
      defaultTab="routes"
      panelTitle={meta.name}
      panelSubtitle={meta.short_description}
    />
  );
}
