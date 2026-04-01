import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getV4SpotBySlug, getV4RouteBySlug, getV4SpotById } from "@/data/v4";
import { BRAND } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { SpotDetailMapSection } from "@/components/route-curated/spot-detail-map-section";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const { V4_SPOTS } = await import("@/data/v4/spots");
  return V4_SPOTS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const spot = getV4SpotBySlug(slug);
  const t = await getTranslations("V4.spotDetail");
  if (!spot) return { title: t("notFound") };
  return { title: `${spot.name} | ${BRAND.name}`, description: spot.shortDescription };
}

export default async function SpotDetailPage({ params }: Props) {
  const { slug } = await params;
  const spot = getV4SpotBySlug(slug);
  const t = await getTranslations("V4.spotDetail");
  if (!spot) notFound();

  const primaryRouteSlug = spot.routeRefs[0];
  const route = primaryRouteSlug ? getV4RouteBySlug(primaryRouteSlug) : null;
  const nextSpot = spot.nearbyNextStopId ? getV4SpotById(spot.nearbyNextStopId) : null;
  const stopOnRoute = route?.stops.find((s) => s.spotId === spot.id);
  const whyInRouteCopy = stopOnRoute?.whyHere ?? spot.routeInclusionNote ?? spot.shortDescription;

  return (
    <article className="mx-auto max-w-3xl pb-16">
      <div className="relative aspect-[16/10] overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-sm)]">
        <Image src={spot.images[0] ?? ""} alt="" fill className="object-cover" priority sizes="100vw" />
      </div>

      <header className="mt-8">
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          {spot.city} · {spot.district}
        </p>
        <h1 className="text-[var(--text-strong)] mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{spot.name}</h1>
      </header>

      <section className="border-border/60 bg-card mt-8 rounded-[var(--radius-card)] border p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-[var(--text-strong)] text-sm font-semibold tracking-wide uppercase">{t("whyInRoute")}</h2>
        <p className="text-foreground mt-3 leading-relaxed">{whyInRouteCopy}</p>
        {route && stopOnRoute ? (
          <p className="text-muted-foreground mt-3 text-xs">
            {t("routeInclusionMeta", {
              order: stopOnRoute.order,
              route: route.title,
            })}
          </p>
        ) : null}
      </section>

      <SpotDetailMapSection lat={spot.coordinates.lat} lng={spot.coordinates.lng} label={spot.name} />

      <dl className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="bg-[var(--bg-surface-subtle)] rounded-[var(--radius-lg)] p-4">
          <dt className="text-muted-foreground text-xs font-semibold uppercase">{t("bestTime")}</dt>
          <dd className="text-[var(--text-strong)] mt-1 font-medium">{spot.bestTime.join(", ")}</dd>
        </div>
        <div className="bg-[var(--bg-surface-subtle)] rounded-[var(--radius-lg)] p-4">
          <dt className="text-muted-foreground text-xs font-semibold uppercase">{t("crowdRisk")}</dt>
          <dd className="text-[var(--text-strong)] mt-1 font-medium">{spot.crowdRisk}</dd>
        </div>
        <div className="bg-[var(--bg-surface-subtle)] rounded-[var(--radius-lg)] p-4">
          <dt className="text-muted-foreground text-xs font-semibold uppercase">{t("photoTone")}</dt>
          <dd className="text-[var(--text-strong)] mt-1 font-medium">{spot.photoTone}</dd>
        </div>
        <div className="bg-[var(--bg-surface-subtle)] rounded-[var(--radius-lg)] p-4">
          <dt className="text-muted-foreground text-xs font-semibold uppercase">{t("vibeTags")}</dt>
          <dd className="text-[var(--text-strong)] mt-1 font-medium">{spot.vibeTags.join(" · ")}</dd>
        </div>
      </dl>

      {nextSpot ? (
        <section className="mt-8">
          <h2 className="text-[var(--text-strong)] mb-3 text-lg font-semibold">{t("nextStop")}</h2>
          <Link
            href={`/explore/spots/${nextSpot.slug}`}
            className="bg-card ring-border/60 block rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)] ring-1"
          >
            <p className="font-semibold">{nextSpot.name}</p>
            <p className="text-muted-foreground mt-1 text-sm">{nextSpot.shortDescription}</p>
          </Link>
        </section>
      ) : null}

      {route ? (
        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild className="rounded-[var(--radius-lg)]">
            <Link href={`/explore/routes/${route.slug}`}>{t("viewRoute")}</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-[var(--radius-lg)]">
            <Link href="/planner">{t("planSimilar")}</Link>
          </Button>
        </div>
      ) : null}
    </article>
  );
}
