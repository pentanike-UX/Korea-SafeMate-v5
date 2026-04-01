"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AIPlanOutput, CuratedRoute } from "@/domain/curated-experience";
import { AlternativeRouteTabs, type AlternativeTabId } from "@/components/route-curated/alternative-route-tabs";
import { AskGuardianPanel, persistPlannerContext } from "@/components/route-curated/ask-guardian-panel";
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
import { cn } from "@/lib/utils";

function guardianSlugForRoute(route: CuratedRoute) {
  return route.slug === "first-night-seoul-north-south" ? "minseo" : "jun";
}

function RoutePanelBody({
  plan,
  primaryRoute,
  displayRoute,
  alternativeRoute,
  altTab,
  setAltTab,
  viewMode,
  setViewMode,
  activeStopId,
  setActiveStopId,
  spotNames,
  stats,
  t,
}: {
  plan: AIPlanOutput;
  primaryRoute: CuratedRoute;
  displayRoute: CuratedRoute;
  alternativeRoute: CuratedRoute | null;
  altTab: AlternativeTabId;
  setAltTab: (v: AlternativeTabId) => void;
  viewMode: RouteViewMode;
  setViewMode: (v: RouteViewMode) => void;
  activeStopId: string | null;
  setActiveStopId: (id: string) => void;
  spotNames: Record<string, string>;
  stats: { distanceMeters: number; durationMinutes: number };
  t: ReturnType<typeof useTranslations<"V4.routeMap">>;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const tabDisabled = useMemo(() => ({ calmer: !alternativeRoute }), [alternativeRoute]);

  useEffect(() => {
    if (!activeStopId || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-stop-id="${activeStopId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeStopId]);

  const weatherNote = altTab === "weather" ? plan.timingTips[0] ?? plan.rationale : null;
  const timingLines = useMemo(
    () => [...plan.timingTips, ...displayRoute.tips].filter((x, i, a) => a.indexOf(x) === i),
    [plan.timingTips, displayRoute.tips],
  );
  const cautionLines = useMemo(
    () => [...plan.cautions, ...displayRoute.cautions].filter((x, i, a) => a.indexOf(x) === i),
    [plan.cautions, displayRoute.cautions],
  );

  const activeRs = useMemo(
    () => (activeStopId ? displayRoute.stops.find((s) => s.id === activeStopId) ?? null : null),
    [activeStopId, displayRoute.stops],
  );

  return (
    <div className="space-y-5 pb-2">
      <AlternativeRouteTabs
        value={altTab}
        onChange={setAltTab}
        disabled={tabDisabled}
        labels={{
          primary: t("alt.primary"),
          calmer: t("alt.calmer"),
          weather: t("alt.weather"),
        }}
      />

      {!alternativeRoute ? <p className="text-muted-foreground text-xs leading-relaxed">{t("noAlternative")}</p> : null}

      {altTab === "weather" && weatherNote ? (
        <p className="text-muted-foreground rounded-[var(--radius-lg)] bg-[var(--info-soft)] p-3 text-xs leading-relaxed">{weatherNote}</p>
      ) : null}

      <CuratedRouteSummaryStack
        route={displayRoute}
        pathStats={stats}
        timingLines={timingLines}
        cautionLines={cautionLines}
      />

      {activeRs ? (
        <output
          key={activeRs.id}
          className="border-border/60 bg-card block rounded-[var(--radius-lg)] border p-4 shadow-[var(--shadow-sm)] ring-1 ring-[color-mix(in_srgb,var(--border-default)_75%,transparent)] transition-opacity duration-200"
          aria-live="polite"
        >
          <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">{t("activeStop.label")}</p>
          <p className="text-[var(--text-strong)] mt-1 font-semibold">{spotNames[activeRs.spotId] ?? `Stop ${activeRs.order}`}</p>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{activeRs.whyHere}</p>
          <p className="text-muted-foreground mt-3 text-xs leading-relaxed">{t("activeStop.flowHint")}</p>
        </output>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentToggle value={viewMode} onChange={setViewMode} labels={{ full: t("view.full"), segment: t("view.segment") }} />
      </div>

      <RouteSummaryCard title={t("whyTitle")} summary={plan.rationale} mood={plan.expectedMood} />

      <section ref={listRef}>
        <h3 className="text-[var(--text-strong)] mb-3 text-xs font-semibold tracking-wide uppercase">{t("stops")}</h3>
        <StopList
          stops={displayRoute.stops}
          pathSegments={displayRoute.pathSegments}
          spotNames={spotNames}
          activeStopId={activeStopId}
          onSelect={setActiveStopId}
        />
      </section>

      {(() => {
        const otherRoute = displayRoute.slug === primaryRoute.slug ? alternativeRoute : primaryRoute;
        return otherRoute ? (
          <Button asChild variant="outline" className="w-full rounded-[var(--radius-lg)]">
            <Link href={`/explore/routes/${otherRoute.slug}`}>{t("openAlternative", { title: otherRoute.title })}</Link>
          </Button>
        ) : null;
      })()}

      <AskGuardianPanel
        guardianSlug={guardianSlugForRoute(displayRoute)}
        routeSlug={displayRoute.slug}
        routeTitle={displayRoute.title}
        plan={plan}
        variant={altTab === "calmer" ? "calmer" : altTab === "weather" ? "weather" : "primary"}
      />
    </div>
  );
}

function firstStopId(route: CuratedRoute) {
  return [...route.stops].sort((a, b) => a.order - b.order)[0]?.id ?? null;
}

function PlannerResultInteractive({
  plan,
  primaryRoute,
  alternativeRoute,
  displayRoute,
  altTab,
  setAltTab,
}: {
  plan: AIPlanOutput;
  primaryRoute: CuratedRoute;
  alternativeRoute: CuratedRoute | null;
  displayRoute: CuratedRoute;
  altTab: AlternativeTabId;
  setAltTab: (v: AlternativeTabId) => void;
}) {
  const t = useTranslations("V4.routeMap");
  const [viewMode, setViewMode] = useState<RouteViewMode>("full");
  const [activeStopId, setActiveStopId] = useState<string | null>(() => firstStopId(displayRoute));

  useEffect(() => {
    if (!alternativeRoute && altTab === "calmer") {
      queueMicrotask(() => setAltTab("primary"));
    }
  }, [alternativeRoute, altTab, setAltTab]);

  const mapStops = useMemo(() => buildCuratedMapStops(displayRoute, getV4SpotById), [displayRoute]);
  const spotNames = useMemo(() => {
    const m: Record<string, string> = {};
    for (const rs of displayRoute.stops) {
      const sp = getV4SpotById(rs.spotId);
      if (sp) m[rs.spotId] = sp.name;
    }
    return m;
  }, [displayRoute]);

  const stats = useMemo(() => aggregatePathStats(displayRoute.pathSegments), [displayRoute.pathSegments]);

  const mapKey = `${displayRoute.slug}-${altTab}`;
  const tabDisabled = useMemo(() => ({ calmer: !alternativeRoute }), [alternativeRoute]);

  const panel = (
    <RoutePanelBody
      plan={plan}
      primaryRoute={primaryRoute}
      displayRoute={displayRoute}
      alternativeRoute={alternativeRoute}
      altTab={altTab}
      setAltTab={setAltTab}
      viewMode={viewMode}
      setViewMode={setViewMode}
      activeStopId={activeStopId}
      setActiveStopId={setActiveStopId}
      spotNames={spotNames}
      stats={stats}
      t={t}
    />
  );

  const footer = (
    <div className="flex flex-wrap gap-2">
      <Button asChild className="flex-1 rounded-[var(--radius-lg)]">
        <Link
          href="/login?next=/mypage/saved"
          onClick={() =>
            persistPlannerContext({
              plan,
              routeSlug: displayRoute.slug,
              routeTitle: displayRoute.title,
              variant: altTab === "calmer" ? "calmer" : altTab === "weather" ? "weather" : "primary",
            })
          }
        >
          {t("save")}
        </Link>
      </Button>
      <Button asChild variant="secondary" className="flex-1 rounded-[var(--radius-lg)]">
        <Link href="/planner">{t("adjust")}</Link>
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
          mapKey={mapKey}
          stops={mapStops}
          routeStops={displayRoute.stops}
          pathSegments={displayRoute.pathSegments}
          viewMode={viewMode}
          activeStopId={activeStopId}
          onStopSelect={setActiveStopId}
          className="h-full w-full rounded-none lg:rounded-l-[var(--radius-card)]"
        />
        <div className="pointer-events-none absolute top-3 left-3 right-3 flex flex-wrap items-start justify-between gap-2 lg:top-4 lg:left-4 lg:right-4">
          <AlternativeRouteTabs
            value={altTab}
            onChange={setAltTab}
            disabled={tabDisabled}
            labels={{
              primary: t("alt.primary"),
              calmer: t("alt.calmer"),
              weather: t("alt.weather"),
            }}
            className="pointer-events-auto"
          />
          <SegmentToggle
            value={viewMode}
            onChange={setViewMode}
            labels={{ full: t("view.full"), segment: t("view.segment") }}
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
        <div className="flex min-h-0 flex-1 flex-col lg:hidden">
          <RouteBottomSheet initialSnap="half" footer={footer}>
            {panel}
          </RouteBottomSheet>
        </div>
      </div>
    </div>
  );
}

export function PlannerResultExperience({
  plan,
  primaryRoute,
  alternativeRoute,
}: {
  plan: AIPlanOutput;
  primaryRoute: CuratedRoute;
  alternativeRoute: CuratedRoute | null;
}) {
  const [altTab, setAltTab] = useState<AlternativeTabId>("primary");

  const displayRoute = useMemo(() => {
    if (altTab === "calmer" && alternativeRoute) return alternativeRoute;
    return primaryRoute;
  }, [altTab, alternativeRoute, primaryRoute]);

  return (
    <PlannerResultInteractive
      key={displayRoute.slug}
      plan={plan}
      primaryRoute={primaryRoute}
      alternativeRoute={alternativeRoute}
      displayRoute={displayRoute}
      altTab={altTab}
      setAltTab={setAltTab}
    />
  );
}
