import { getTranslations } from "next-intl/server";
import { ExploreWorkspaceClient } from "@/components/explore/explore-workspace-client";
import { BRAND } from "@/lib/constants";
import { buildExploreWorkspacePayload } from "@/lib/v4/explore-workspace-payload";

export async function generateMetadata() {
  const t = await getTranslations("V4.workspace.explore");
  return { title: `${t("metaTitle")} | ${BRAND.name}`, description: t("metaDescription") };
}

export default async function ExploreIndexPage() {
  const { routes, spots, stories } = buildExploreWorkspacePayload();
  return <ExploreWorkspaceClient routes={routes} spots={spots} stories={stories} defaultTab="routes" />;
}
