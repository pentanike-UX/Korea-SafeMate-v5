import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getMockAiPlanSummaries, getMockSavedRouteSlugs, getMockSavedSpotSlugs } from "@/data/v4/saved-mock";
import { getV4RouteBySlug, getV4SpotBySlug } from "@/data/v4";
import { BRAND } from "@/lib/constants";

export async function generateMetadata() {
  const t = await getTranslations("V4.savedPage");
  return { title: `${t("metaTitle")} | ${BRAND.name}`, description: t("metaDescription") };
}

export default async function MypageSavedHubPage() {
  const t = await getTranslations("V4.savedPage");
  const routeSlugs = getMockSavedRouteSlugs();
  const spotSlugs = getMockSavedSpotSlugs();
  const plans = getMockAiPlanSummaries();

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-[var(--text-strong)] text-2xl font-semibold sm:text-3xl">{t("title")}</h1>
        <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">{t("lead")}</p>
      </header>

      <section>
        <h2 className="text-[var(--text-strong)] text-sm font-semibold tracking-wide uppercase">{t("routes")}</h2>
        <ul className="mt-3 space-y-2">
          {routeSlugs.map((slug) => {
            const r = getV4RouteBySlug(slug);
            if (!r) return null;
            return (
              <li key={slug}>
                <Link href={`/explore/routes/${slug}`} className="text-[var(--brand-trust-blue)] text-sm font-medium hover:underline">
                  {r.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="text-[var(--text-strong)] text-sm font-semibold tracking-wide uppercase">{t("spots")}</h2>
        <ul className="mt-3 space-y-2">
          {spotSlugs.map((slug) => {
            const s = getV4SpotBySlug(slug);
            if (!s) return null;
            return (
              <li key={slug}>
                <Link href={`/explore/spots/${slug}`} className="text-[var(--brand-trust-blue)] text-sm font-medium hover:underline">
                  {s.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="text-[var(--text-strong)] text-sm font-semibold tracking-wide uppercase">{t("aiPlans")}</h2>
        <ul className="mt-3 space-y-3">
          {plans.map((p) => (
            <li key={p.id} className="bg-card ring-border/60 rounded-[var(--radius-lg)] p-4 ring-1">
              <p className="text-foreground text-sm font-medium">{p.summary}</p>
              <p className="text-muted-foreground mt-1 text-xs tabular-nums">{new Date(p.createdAt).toLocaleString()}</p>
              <Link href="/planner" className="text-[var(--brand-trust-blue)] mt-2 inline-block text-xs font-semibold">
                {t("reopenPlanner")}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-[var(--text-strong)] text-sm font-semibold tracking-wide uppercase">{t("legacy")}</h2>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <Link href="/mypage/saved-posts" className="text-[var(--brand-trust-blue)] font-medium hover:underline">
            {t("savedPosts")}
          </Link>
          <Link href="/mypage/saved-guardians" className="text-[var(--brand-trust-blue)] font-medium hover:underline">
            {t("savedGuardians")}
          </Link>
        </div>
      </section>
    </div>
  );
}
