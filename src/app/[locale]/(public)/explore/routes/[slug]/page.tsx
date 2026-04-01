import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getV4RouteBySlug, getV4SpotById } from "@/data/v4";
import { BRAND } from "@/lib/constants";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const { listPublishedV4Routes } = await import("@/data/v4");
  return listPublishedV4Routes().map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const route = getV4RouteBySlug(slug);
  const t = await getTranslations("V4.routeDetail");
  if (!route) return { title: t("notFound") };
  return { title: `${route.title} | ${BRAND.name}`, description: route.subtitle };
}

export default async function RouteDetailPage({ params }: Props) {
  const { slug } = await params;
  const route = getV4RouteBySlug(slug);
  const t = await getTranslations("V4.routeDetail");
  if (!route) notFound();

  const alt = route.alternativeSlug ? getV4RouteBySlug(route.alternativeSlug) : null;
  const guideSlug = route.slug === "first-night-seoul-north-south" ? "minseo" : "jun";

  return (
    <article className="mx-auto max-w-3xl pb-16">
      <div className="relative aspect-[21/9] w-full overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-sm)]">
        <Image src={route.heroImage} alt="" fill className="object-cover" priority sizes="100vw" />
      </div>
      <div className="mt-8 space-y-3">
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          {route.city} · {route.district}
        </p>
        <h1 className="text-[var(--text-strong)] text-3xl font-semibold tracking-tight sm:text-4xl">{route.title}</h1>
        <p className="text-muted-foreground text-lg leading-relaxed">{route.subtitle}</p>
      </div>

      <section className="border-border/60 bg-card mt-10 space-y-3 rounded-[var(--radius-card)] border p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-[var(--text-strong)] text-sm font-semibold tracking-wide uppercase">{t("whyRoute")}</h2>
        <p className="text-foreground text-base leading-relaxed">{route.whyThisRoute}</p>
        {route.expectedMood ? (
          <p className="text-muted-foreground text-sm">
            <span className="text-[var(--text-strong)] font-medium">{t("mood")} </span>
            {route.expectedMood}
          </p>
        ) : null}
      </section>

      <section className="mt-10">
        <h2 className="text-[var(--text-strong)] mb-4 text-xl font-semibold">{t("stops")}</h2>
        <ol className="space-y-6">
          {route.stops
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((stop, i) => {
              const spot = getV4SpotById(stop.spotId);
              if (!spot) return null;
              return (
                <li
                  key={stop.id}
                  className="bg-card ring-border/60 flex gap-4 rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)] ring-1 sm:gap-5 sm:p-5"
                >
                  <span className="text-muted-foreground w-8 shrink-0 pt-1 text-sm font-semibold tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/explore/spots/${spot.slug}`} className="text-[var(--text-strong)] text-lg font-semibold hover:underline">
                      {spot.name}
                    </Link>
                    <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{stop.whyHere}</p>
                    <p className="text-muted-foreground mt-2 text-xs font-medium">
                      {stop.stayMinutes} min · {stop.transitionHint}
                    </p>
                  </div>
                </li>
              );
            })}
        </ol>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="bg-[var(--success-soft)] rounded-[var(--radius-lg)] p-5">
          <h3 className="text-[var(--text-strong)] text-sm font-semibold">{t("tips")}</h3>
          <ul className="text-muted-foreground mt-2 list-inside list-disc space-y-1 text-sm">
            {route.tips.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <div className="bg-[var(--warning-soft)] rounded-[var(--radius-lg)] p-5">
          <h3 className="text-[var(--text-strong)] text-sm font-semibold">{t("cautions")}</h3>
          <ul className="text-muted-foreground mt-2 list-inside list-disc space-y-1 text-sm">
            {route.cautions.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      </section>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button asChild size="lg" className="rounded-[var(--radius-lg)]">
          <Link href={`/guardians/guide/${guideSlug}`}>{t("askGuardian")}</Link>
        </Button>
        {alt ? (
          <Button asChild variant="outline" size="lg" className="rounded-[var(--radius-lg)]">
            <Link href={`/explore/routes/${alt.slug}`}>{t("alternative")}</Link>
          </Button>
        ) : null}
        <Button asChild variant="secondary" size="lg" className="rounded-[var(--radius-lg)]">
          <Link href="/explore/routes">{t("similar")}</Link>
        </Button>
      </div>
    </article>
  );
}
