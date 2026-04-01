"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { WorkspaceBinder, type WorkspaceRegistration } from "@/components/app-shell/workspace-registry";
import { FullBleedAmbientMap } from "@/components/map-shell/full-bleed-ambient-map";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MOOD_KEYS = ["calm", "late", "solo", "rain", "firstNight"] as const;

type RegionPreset = "seoul_core" | "han_river" | "gangnam";

const REGIONS: { key: RegionPreset; labelKey: "seoulCore" | "hanRiver" | "gangnam" }[] = [
  { key: "seoul_core", labelKey: "seoulCore" },
  { key: "han_river", labelKey: "hanRiver" },
  { key: "gangnam", labelKey: "gangnam" },
];

function HomePanelBody({
  region,
  setRegion,
  featuredRoutes,
}: {
  region: RegionPreset;
  setRegion: (r: RegionPreset) => void;
  featuredRoutes: { slug: string; title: string }[];
}) {
  const t = useTranslations("V4.home");

  return (
    <div className="space-y-8">
      <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.2em] uppercase">{t("eyebrow")}</p>

      <section className="space-y-2">
        <h2 className="text-[var(--text-strong)] text-xs font-semibold tracking-wide uppercase">{t("mapRegionLabel")}</h2>
        <div className="flex flex-wrap gap-2">
          {REGIONS.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRegion(r.key)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors sm:text-sm",
                region === r.key
                  ? "bg-[var(--text-strong)] text-[var(--text-on-brand)]"
                  : "bg-card text-[var(--text-strong)]/85 ring-1 ring-[var(--border-default)] hover:bg-[var(--brand-primary-soft)]",
              )}
            >
              {t(`mapRegions.${r.labelKey}`)}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-[var(--text-strong)] text-xs font-semibold tracking-wide uppercase">{t("moodLabel")}</h2>
        <div className="flex flex-wrap gap-2">
          {MOOD_KEYS.map((k) => (
            <Button
              key={k}
              asChild
              variant="secondary"
              size="sm"
              className="h-9 rounded-full border-0 bg-card px-3.5 text-xs font-medium shadow-none ring-1 ring-[var(--border-default)] hover:bg-[var(--brand-primary-soft)] sm:text-sm"
            >
              <Link href={`/planner?mood=${k}`}>{t(`mood.${k}`)}</Link>
            </Button>
          ))}
        </div>
      </section>

      {featuredRoutes.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-[var(--text-strong)] text-xs font-semibold tracking-wide uppercase">{t("routesTitle")}</h2>
          <ul className="space-y-2">
            {featuredRoutes.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/explore/routes/${r.slug}`}
                  className="bg-card ring-border/55 block rounded-[var(--radius-lg)] px-4 py-3 text-sm font-medium shadow-[var(--shadow-sm)] ring-1 transition-colors hover:bg-[var(--bg-surface-subtle)]"
                >
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/explore/routes" className="text-muted-foreground inline-block text-xs font-medium underline-offset-4 hover:underline">
            {t("routesAll")}
          </Link>
        </section>
      ) : null}
    </div>
  );
}

export function HomeMapPrimaryClient({ featuredRoutes }: { featuredRoutes: { slug: string; title: string }[] }) {
  const t = useTranslations("V4.home");
  const [region, setRegion] = useState<RegionPreset>("seoul_core");

  const registration: WorkspaceRegistration = useMemo(
    () => ({
      contextKey: "home",
      panelTitle: t("heroTitle"),
      panelSubtitle: t("mapHeroLead"),
      panelBody: <HomePanelBody region={region} setRegion={setRegion} featuredRoutes={featuredRoutes} />,
      stickyAction: (
        <div className="flex flex-wrap gap-2">
          <Button asChild className="h-11 flex-1 rounded-[14px] px-4 text-sm font-semibold">
            <Link href="/planner">{t("ctaPlanner")}</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 flex-1 rounded-[14px] border-[var(--border-strong)] bg-transparent">
            <Link href="/explore/routes">{t("ctaExplore")}</Link>
          </Button>
        </div>
      ),
      map: <FullBleedAmbientMap region={region} className="h-full w-full" />,
      initialSheetSnap: "half",
    }),
    [region, featuredRoutes, t],
  );

  return (
    <>
      <WorkspaceBinder registration={registration} />
    </>
  );
}
