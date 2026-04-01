import { getTranslations } from "next-intl/server";
import { listPublishedV4Routes } from "@/data/v4";
import { V4RouteCard } from "@/components/v4/v4-route-card";
import { BRAND } from "@/lib/constants";

export async function generateMetadata() {
  const t = await getTranslations("V4.exploreRoutes");
  return { title: `${t("metaTitle")} | ${BRAND.name}`, description: t("metaDescription") };
}

export default async function ExploreRoutesPage() {
  const t = await getTranslations("V4.exploreRoutes");
  const routes = listPublishedV4Routes();

  return (
    <div className="space-y-10">
      <header className="max-w-2xl">
        <h1 className="text-[var(--text-strong)] text-3xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h1>
        <p className="text-muted-foreground mt-3 text-base leading-relaxed">{t("lead")}</p>
      </header>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {routes.map((r) => (
          <V4RouteCard key={r.id} route={r} saveHref="/login?next=/mypage/saved" />
        ))}
      </div>
    </div>
  );
}
