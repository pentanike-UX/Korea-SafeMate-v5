"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { CuratedRoute } from "@/domain/curated-experience";
import { AskGuardianPanel } from "@/components/route-curated/ask-guardian-panel";
import { CuratedRouteSummaryStack } from "@/components/route-curated/curated-route-summary-stack";
import { RouteBottomSheet } from "@/components/route-curated/route-bottom-sheet";
import { RouteMap } from "@/components/route-curated/route-map";
import { RouteSummaryCard } from "@/components/route-curated/route-summary-card";
import { SegmentToggle, type RouteViewMode } from "@/components/route-curated/segment-toggle";
import { StopList } from "@/components/route-curated/stop-list";
import { Button } from "@/components/ui/button";
import { getV4SpotById } from "@/data/v4";
import { buildCuratedMapStops } from "@/lib/route-curated/build-stops";
import { aggregatePathStats } from "@/lib/route-curated/geometry";
import { writeGuardianPlannerContext } from "@/lib/v4/guardian-planner-context";
import { cn } from "@/lib/utils";

function guardianSlugForRoute(route: CuratedRoute) {
  return route.slug === "first-night-seoul-north-south" ? "minseo" : "jun";
}

export type SimilarRouteCard = { slug: string; title: string; summary: string };

function RouteDetailPanel({
  route,
  alternativeRoute,
  viewMode,
  setViewMode,
  activeStopId,
  setActiveStopId,
  spotNames,
  stats,
  similar,
  tMap,
  tDetail,
}: {
  route: CuratedRoute;
  alternativeRoute: CuratedRoute | null;
  viewMode: RouteViewMode;
  setViewMode: (v: RouteViewMode) => void;
  activeStopId: string | null;
  setActiveStopId: (id: string) => void;
  spotNames: Record<string, string>;
  stats: { distanceMeters: number; durationMinutes: number };
  similar: SimilarRouteCard[];
  tMap: ReturnType<typeof useTranslations<"V4.routeMap">>;
  tDetail: ReturnType<typeof useTranslations<"V4.routeDetail">>;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeStopId || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-stop-id="${activeStopId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeStopId]);

  const activeRs = useMemo(
    () => (activeStopId ? route.stops.find((s) => s.id === activeStopId) ?? null : null),
    [activeStopId, route.stops],
  );

  return (
    <div className="space-y-5 pb-2">
      <div className="relative mb-1 hidden aspect-[2/1] w-full overflow-hidden rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] lg:block">
        <Image src={route.heroImage} alt="" fill className="object-cover" sizes="420px" />
      </div>
      <header className="space-y-2">
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          {route.city} · {route.district}
        </p>
        <h1 className="text-[var(--text-strong)] text-2xl font-semibold tracking-tight sm:text-3xl">{route.title}</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">{route.subtitle}</p>
      </header>

      {!alternativeRoute ? <p className="text-muted-foreground text-xs leading-relaxed">{tMap("noAlternative")}</p> : null}

      <CuratedRouteSummaryStack route={route} pathStats={stats} timingLines={route.tips} cautionLines={route.cautions} />

      {activeRs ? (
        <output
          key={activeRs.id}
          className="border-border/60 bg-card block rounded-[var(--radius-lg)] border p-4 shadow-[var(--shadow-sm)] ring-1 ring-[color-mix(in_srgb,var(--border-default)_75%,transparent)] transition-opacity duration-200"
          aria-live="polite"
        >
          <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">{tMap("activeStop.label")}</p>
          <p className="text-[var(--text-strong)] mt-1 font-semibold">{spotNames[activeRs.spotId] ?? `Stop ${activeRs.order}`}</p>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{activeRs.whyHere}</p>
          <p className="text-muted-foreground mt-3 text-xs leading-relaxed">{tMap("activeStop.flowHint")}</p>
        </output>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentToggle value={viewMode} onChange={setViewMode} labels={{ full: tMap("view.full"), segment: tMap("view.segment") }} />
      </div>

      <RouteSummaryCard title={tDetail("whyRoute")} summary={route.summary} mood={route.expectedMood} />

      <p className="text-muted-foreground text-sm leading-relaxed">{route.whyThisRoute}</p>

      <section ref={listRef}>
        <h3 className="text-[var(--text-strong)] mb-3 text-xs font-semibold tracking-wide uppercase">{tDetail("stops")}</h3>
        <StopList
          stops={route.stops}
          pathSegments={route.pathSegments}
          spotNames={spotNames}
          activeStopId={activeStopId}
          onSelect={setActiveStopId}
        />
      </section>

      {alternativeRoute ? (
        <Button asChild variant="outline" className="w-full rounded-[var(--radius-lg)]">
          <Link href={`/explore/routes/${alternativeRoute.slug}`}>
            {tMap("openAlternative", { title: alternativeRoute.title })}
          </Link>
        </Button>
      ) : null}

      {similar.length > 0 ? (
        <section>
          <h3 className="text-[var(--text-strong)] mb-3 text-xs font-semibold tracking-wide uppercase">{tDetail("similar")}</h3>
          <ul className="space-y-2">
            {similar.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/explore/routes/${s.slug}`}
                  className="bg-card ring-border/60 block rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)] ring-1 transition-colors hover:bg-[var(--bg-surface-subtle)]"
                >
                  <p className="text-[var(--text-strong)] font-semibold">{s.title}</p>
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{s.summary}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <AskGuardianPanel
        guardianSlug={guardianSlugForRoute(route)}
        routeSlug={route.slug}
        routeTitle={route.title}
        variant="primary"
      />
    </div>
  );
}

export function RouteDetailExperience({
  route,
  alternativeRoute,
  similar,
}: {
  route: CuratedRoute;
  alternativeRoute: CuratedRoute | null;
  similar: SimilarRouteCard[];
}) {
  const tMap = useTranslations("V4.routeMap");
  const tDetail = useTranslations("V4.routeDetail");
  const [viewMode, setViewMode] = useState<RouteViewMode>("full");
  const sorted = [...route.stops].sort((a, b) => a.order - b.order);
  const [activeStopId, setActiveStopId] = useState<string | null>(() => sorted[0]?.id ?? null);

  const mapStops = useMemo(() => buildCuratedMapStops(route, getV4SpotById), [route]);
  const spotNames = useMemo(() => {
    const m: Record<string, string> = {};
    for (const rs of route.stops) {
      const sp = getV4SpotById(rs.spotId);
      if (sp) m[rs.spotId] = sp.name;
    }
    return m;
  }, [route]);

  const stats = useMemo(() => aggregatePathStats(route.pathSegments), [route.pathSegments]);

  const panel = (
    <RouteDetailPanel
      route={route}
      alternativeRoute={alternativeRoute}
      viewMode={viewMode}
      setViewMode={setViewMode}
      activeStopId={activeStopId}
      setActiveStopId={setActiveStopId}
      spotNames={spotNames}
      stats={stats}
      similar={similar}
      tMap={tMap}
      tDetail={tDetail}
    />
  );

  const footer = (
    <div className="flex flex-wrap gap-2">
      <Button asChild className="flex-1 rounded-[var(--radius-lg)]">
        <Link
          href="/login?next=/mypage/saved"
          onClick={() =>
            writeGuardianPlannerContext({
              routeSlug: route.slug,
              routeTitle: route.title,
              variant: "primary",
            })
          }
        >
          {tMap("save")}
        </Link>
      </Button>
      <Button asChild variant="secondary" className="flex-1 rounded-[var(--radius-lg)]">
        <Link href="/planner">{tMap("adjust")}</Link>
      </Button>
    </div>
  );

  return (
    <div className="bg-[var(--bg-page)] flex min-h-[100dvh] flex-col lg:grid lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(300px,420px)_1fr] lg:gap-0">
      <div
        className={cn(
          "relative z-0 h-[38vh] min-h-[220px] w-full shrink-0 lg:sticky lg:top-16 lg:order-2 lg:h-[calc(100dvh-4rem)] lg:min-h-0",
        )}
      >
        <RouteMap
          mapKey={route.slug}
          stops={mapStops}
          routeStops={route.stops}
          pathSegments={route.pathSegments}
          viewMode={viewMode}
          activeStopId={activeStopId}
          onStopSelect={setActiveStopId}
          className="h-full w-full rounded-none lg:rounded-l-[var(--radius-card)]"
        />
        <div className="pointer-events-none absolute top-3 left-3 right-3 flex flex-wrap items-start justify-end gap-2 lg:top-4 lg:left-4 lg:right-4">
          <SegmentToggle
            value={viewMode}
            onChange={setViewMode}
            labels={{ full: tMap("view.full"), segment: tMap("view.segment") }}
            className="pointer-events-auto hidden sm:inline-flex"
          />
        </div>
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col lg:order-1 lg:border-r lg:border-[var(--border-default)] lg:bg-[var(--bg-surface)]">
        <div className="hidden min-h-0 flex-1 flex-col lg:flex">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6">{panel}</div>
          <div className="border-border/60 bg-[color-mix(in_srgb,var(--bg-surface)_96%,transparent)] shrink-0 border-t px-5 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.05)]">
            {footer}
          </div>
        </div>
        <div className="flex flex-1 flex-col lg:hidden">
          <RouteBottomSheet initialSnap="half" footer={footer}>
            {panel}
          </RouteBottomSheet>
        </div>
      </div>
    </div>
  );
}
