import { getTranslations } from "next-intl/server";
import { V4_SPOTS } from "@/data/v4/spots";
import { V4SpotRow } from "@/components/v4/v4-spot-row";
import { BRAND } from "@/lib/constants";

export async function generateMetadata() {
  const t = await getTranslations("V4.exploreSpots");
  return { title: `${t("metaTitle")} | ${BRAND.name}`, description: t("metaDescription") };
}

export default async function ExploreSpotsPage() {
  const t = await getTranslations("V4.exploreSpots");

  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <h1 className="text-[var(--text-strong)] text-3xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h1>
        <p className="text-muted-foreground mt-3 text-base leading-relaxed">{t("lead")}</p>
      </header>
      <ul className="space-y-3">
        {V4_SPOTS.map((spot) => (
          <li key={spot.id}>
            <V4SpotRow spot={spot} />
          </li>
        ))}
      </ul>
    </div>
  );
}
