import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildMockAIPlan, getV4RouteBySlug } from "@/data/v4";
import { decodePlannerPayload } from "@/lib/v4/planner-payload";
import { BRAND } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { PlannerResultExperience } from "@/components/route-curated/planner-result-experience";
import { RouteExperienceFault } from "@/components/route-curated/route-experience-states";

type Props = { searchParams: Promise<{ p?: string }> };

export async function generateMetadata() {
  const t = await getTranslations("V4.plannerResult");
  return { title: `${t("metaTitle")} | ${BRAND.name}`, description: t("metaDescription") };
}

export default async function PlannerResultPage({ searchParams }: Props) {
  const { p } = await searchParams;
  const t = await getTranslations("V4.plannerResult");
  const ts = await getTranslations("V4.routeMap.states");
  const input = decodePlannerPayload(p);

  if (!input) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-6 py-16">
        <h1 className="text-[var(--text-strong)] text-2xl font-semibold">{t("invalidTitle")}</h1>
        <p className="text-muted-foreground mt-2 max-w-md text-center">{t("invalidLead")}</p>
        <Button asChild className="mt-6 rounded-[var(--radius-lg)]">
          <Link href="/planner">{t("back")}</Link>
        </Button>
      </div>
    );
  }

  const plan = buildMockAIPlan(input);
  const primary = getV4RouteBySlug(plan.routesSuggested[0] ?? "");
  const alt = plan.alternativeRouteSlug ? (getV4RouteBySlug(plan.alternativeRouteSlug) ?? null) : null;

  if (!primary) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-6 py-12">
        <RouteExperienceFault
          title={ts("planFailedTitle")}
          description={ts("planFailedLead")}
          primaryHref="/planner"
          primaryLabel={t("back")}
          secondaryHref="/explore/routes"
          secondaryLabel={t("openRoute")}
        />
      </div>
    );
  }

  return <PlannerResultExperience plan={plan} primaryRoute={primary} alternativeRoute={alt} />;
}
