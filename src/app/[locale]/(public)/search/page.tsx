import { getTranslations } from "next-intl/server";
import { SearchV4Client } from "@/components/v4/search-v4-client";
import { listPublishedV4Routes, V4_SPOTS } from "@/data/v4";
import { BRAND } from "@/lib/constants";

export async function generateMetadata() {
  const t = await getTranslations("V4.search");
  return { title: `${t("metaTitle")} | ${BRAND.name}`, description: t("metaDescription") };
}

export default async function SearchPage() {
  const routes = listPublishedV4Routes();
  const spots = V4_SPOTS;

  return (
    <div className="bg-[var(--bg-page)] page-container py-10 pb-28 sm:py-12">
      <SearchV4Client
        routes={routes.map((r) => ({ slug: r.slug, title: r.title, subtitle: r.subtitle }))}
        spots={spots.map((s) => ({ slug: s.slug, name: s.name, district: s.district }))}
      />
    </div>
  );
}
