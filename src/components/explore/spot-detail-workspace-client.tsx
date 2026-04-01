"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { WorkspaceBinder, type WorkspaceRegistration } from "@/components/app-shell/workspace-registry";
import { SpotPinMap } from "@/components/route-curated/spot-pin-map";
import { Button } from "@/components/ui/button";

export type SpotDetailWorkspacePayload = {
  name: string;
  city: string;
  district: string;
  coverImage: string;
  whyInRouteCopy: string;
  routeMeta: { order: number; routeTitle: string; routeSlug: string } | null;
  lat: number;
  lng: number;
  bestTime: string[];
  crowdRisk: string;
  photoTone: string;
  vibeTags: string[];
  nextSpot: { slug: string; name: string; shortDescription: string } | null;
  primaryRouteSlug: string | null;
};

export function SpotDetailWorkspaceClient({ spot }: { spot: SpotDetailWorkspacePayload }) {
  const t = useTranslations("V4.spotDetail");

  const panelBody = (
    <div className="space-y-5">
      {spot.coverImage ? (
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)]">
          <Image src={spot.coverImage} alt="" fill className="object-cover" sizes="(max-width:420px) 100vw, 380px" />
        </div>
      ) : null}

      <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
        {spot.city} · {spot.district}
      </p>

      <section>
        <h2 className="text-[var(--text-strong)] text-xs font-semibold tracking-wide uppercase">{t("whyInRoute")}</h2>
        <p className="text-foreground mt-2 text-sm leading-relaxed">{spot.whyInRouteCopy}</p>
        {spot.routeMeta ? (
          <p className="text-muted-foreground mt-2 text-xs">
            {t("routeInclusionMeta", {
              order: spot.routeMeta.order,
              route: spot.routeMeta.routeTitle,
            })}
          </p>
        ) : null}
      </section>

      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="bg-[var(--bg-surface-subtle)] rounded-[var(--radius-lg)] p-3">
          <dt className="text-muted-foreground text-[10px] font-semibold uppercase">{t("bestTime")}</dt>
          <dd className="text-[var(--text-strong)] mt-1 text-sm font-medium">{spot.bestTime.join(", ")}</dd>
        </div>
        <div className="bg-[var(--bg-surface-subtle)] rounded-[var(--radius-lg)] p-3">
          <dt className="text-muted-foreground text-[10px] font-semibold uppercase">{t("crowdRisk")}</dt>
          <dd className="text-[var(--text-strong)] mt-1 text-sm font-medium">{spot.crowdRisk}</dd>
        </div>
        <div className="bg-[var(--bg-surface-subtle)] rounded-[var(--radius-lg)] p-3">
          <dt className="text-muted-foreground text-[10px] font-semibold uppercase">{t("photoTone")}</dt>
          <dd className="text-[var(--text-strong)] mt-1 text-sm font-medium">{spot.photoTone}</dd>
        </div>
        <div className="bg-[var(--bg-surface-subtle)] rounded-[var(--radius-lg)] p-3">
          <dt className="text-muted-foreground text-[10px] font-semibold uppercase">{t("vibeTags")}</dt>
          <dd className="text-[var(--text-strong)] mt-1 text-sm font-medium">{spot.vibeTags.join(" · ")}</dd>
        </div>
      </dl>

      {spot.nextSpot ? (
        <section>
          <h2 className="text-[var(--text-strong)] mb-2 text-xs font-semibold tracking-wide uppercase">{t("nextStop")}</h2>
          <Link
            href={`/explore/spots/${spot.nextSpot.slug}`}
            className="bg-card ring-border/55 block rounded-[var(--radius-lg)] p-3 text-sm shadow-[var(--shadow-sm)] ring-1"
          >
            <p className="font-semibold">{spot.nextSpot.name}</p>
            <p className="text-muted-foreground mt-1 text-xs">{spot.nextSpot.shortDescription}</p>
          </Link>
        </section>
      ) : null}
    </div>
  );

  const footer = spot.primaryRouteSlug ? (
    <div className="flex flex-wrap gap-2">
      <Button asChild className="flex-1 rounded-[var(--radius-lg)]">
        <Link href={`/explore/routes/${spot.primaryRouteSlug}`}>{t("viewRoute")}</Link>
      </Button>
      <Button asChild variant="outline" className="flex-1 rounded-[var(--radius-lg)]">
        <Link href="/planner">{t("planSimilar")}</Link>
      </Button>
    </div>
  ) : (
    <Button asChild className="w-full rounded-[var(--radius-lg)]">
      <Link href="/planner">{t("planSimilar")}</Link>
    </Button>
  );

  const registration: WorkspaceRegistration = {
    contextKey: "spot-detail",
    panelTitle: spot.name,
    panelSubtitle: `${spot.city} · ${spot.district}`,
    panelBody,
    panelFooterPrimary: (
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="secondary" className="flex-1 rounded-[var(--radius-lg)]">
          <Link href="/login?next=/mypage/saved">{t("saveCta")}</Link>
        </Button>
      </div>
    ),
    stickyAction: footer,
    map: (
      <div className="relative h-full w-full">
        <SpotPinMap
          key={`${spot.lat}-${spot.lng}-${spot.name}`}
          lat={spot.lat}
          lng={spot.lng}
          label={spot.name}
          className="h-full min-h-[240px] w-full"
        />
      </div>
    ),
    initialSheetSnap: "half",
  };

  return <WorkspaceBinder registration={registration} />;
}
