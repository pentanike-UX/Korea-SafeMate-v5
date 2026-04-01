import { getTranslations } from "next-intl/server";
import { ExploreWorkspaceClient } from "@/components/explore/explore-workspace-client";
import { listPublishedV4Routes } from "@/data/v4";
import { BRAND } from "@/lib/constants";
import { buildExploreWorkspacePayload } from "@/lib/v4/explore-workspace-payload";

export async function generateMetadata() {
  const t = await getTranslations("V4.exploreTime");
  return { title: `${t("metaTitle")} | ${BRAND.name}`, description: t("metaDescription") };
}

export default async function ExploreTimePage() {
  const t = await getTranslations("V4.exploreTime");
  const { spots, stories } = buildExploreWorkspacePayload();
  const routes = listPublishedV4Routes()
    .filter((r) => r.timeOfDay.includes("evening") || r.timeOfDay.includes("late_night"))
    .map((r) => ({ slug: r.slug, title: r.title, summary: r.summary }));

  return (
    <ExploreWorkspaceClient
      routes={routes}
      spots={spots}
      stories={stories}
      defaultTab="routes"
      panelTitle={t("title")}
      panelSubtitle={t("lead")}
    />
  );
}
