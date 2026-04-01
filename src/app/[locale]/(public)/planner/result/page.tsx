import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildMockAIPlan, getV4RouteBySlug } from "@/data/v4";
import { decodePlannerPayload } from "@/lib/v4/planner-payload";
import { BRAND } from "@/lib/constants";
import { Button } from "@/components/ui/button";

type Props = { searchParams: Promise<{ p?: string }> };

export async function generateMetadata() {
  const t = await getTranslations("V4.plannerResult");
  return { title: `${t("metaTitle")} | ${BRAND.name}`, description: t("metaDescription") };
}

export default async function PlannerResultPage({ searchParams }: Props) {
  const { p } = await searchParams;
  const t = await getTranslations("V4.plannerResult");
  const input = decodePlannerPayload(p);

  if (!input) {
    return (
      <div className="bg-[var(--bg-page)] page-container py-20">
        <h1 className="text-[var(--text-strong)] text-2xl font-semibold">{t("invalidTitle")}</h1>
        <p className="text-muted-foreground mt-2 max-w-md">{t("invalidLead")}</p>
        <Button asChild className="mt-6 rounded-[var(--radius-lg)]">
          <Link href="/planner">{t("back")}</Link>
        </Button>
      </div>
    );
  }

  const plan = buildMockAIPlan(input);
  const primary = getV4RouteBySlug(plan.routesSuggested[0] ?? "");
  const alt = plan.alternativeRouteSlug ? getV4RouteBySlug(plan.alternativeRouteSlug) : null;

  return (
    <div className="bg-[var(--bg-page)] page-container py-10 pb-28 sm:py-14">
      <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">{t("eyebrow")}</p>
      <h1 className="text-[var(--text-strong)] mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h1>
      <p className="text-muted-foreground mt-4 max-w-2xl text-base leading-relaxed">{plan.outputSummary}</p>

      <section className="border-border/60 bg-card mt-10 space-y-4 rounded-[var(--radius-card)] border p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-[var(--text-strong)] text-sm font-semibold tracking-wide uppercase">{t("rationale")}</h2>
        <p className="text-foreground leading-relaxed">{plan.rationale}</p>
        <p className="text-muted-foreground text-sm">
          <span className="text-[var(--text-strong)] font-medium">{t("mood")} </span>
          {plan.expectedMood}
        </p>
      </section>

      {primary ? (
        <section className="mt-10">
          <h2 className="text-[var(--text-strong)] mb-4 text-xl font-semibold">{t("sequence")}</h2>
          <ol className="space-y-3">
            {primary.stops
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((s, i) => (
                <li
                  key={s.id}
                  className="bg-card ring-border/60 flex gap-3 rounded-[var(--radius-lg)] px-4 py-3 ring-1"
                >
                  <span className="text-muted-foreground w-6 shrink-0 pt-0.5 text-sm font-semibold tabular-nums">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{s.transitionHint}</p>
                    <p className="text-muted-foreground mt-1 text-sm">{s.whyHere}</p>
                  </div>
                </li>
              ))}
          </ol>
        </section>
      ) : null}

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-[var(--radius-lg)] bg-[var(--success-soft)] p-5">
          <h3 className="text-[var(--text-strong)] text-sm font-semibold">{t("timing")}</h3>
          <ul className="text-muted-foreground mt-2 list-inside list-disc space-y-1 text-sm">
            {plan.timingTips.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-[var(--radius-lg)] bg-[var(--warning-soft)] p-5">
          <h3 className="text-[var(--text-strong)] text-sm font-semibold">{t("cautions")}</h3>
          <ul className="text-muted-foreground mt-2 list-inside list-disc space-y-1 text-sm">
            {plan.cautions.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      </section>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {primary ? (
          <Button asChild size="lg" className="rounded-[var(--radius-lg)]">
            <Link href={`/explore/routes/${primary.slug}`}>{t("openRoute")}</Link>
          </Button>
        ) : null}
        {alt ? (
          <Button asChild variant="outline" size="lg" className="rounded-[var(--radius-lg)]">
            <Link href={`/explore/routes/${alt.slug}`}>{t("alternative")}</Link>
          </Button>
        ) : null}
        <Button asChild variant="secondary" size="lg" className="rounded-[var(--radius-lg)]">
          <Link href="/guardians/guide/minseo">{t("askGuardian")}</Link>
        </Button>
        <Button asChild variant="ghost" size="lg" className="rounded-[var(--radius-lg)]">
          <Link href="/planner">{t("adjust")}</Link>
        </Button>
      </div>
    </div>
  );
}
