"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { WorkspaceBinder, type WorkspaceRegistration } from "@/components/app-shell/workspace-registry";
import { FullBleedAmbientMap } from "@/components/map-shell/full-bleed-ambient-map";
import { cn } from "@/lib/utils";

type Tab = "routes" | "spots" | "stories";

const FILTERS = ["calm", "night", "solo", "river"] as const;

export function ExploreWorkspaceClient({
  routes,
  spots,
  stories,
  defaultTab,
  panelTitle,
  panelSubtitle,
}: {
  routes: { slug: string; title: string; summary: string }[];
  spots: { slug: string; name: string; shortDescription: string; vibeTags: string[] }[];
  stories: { slug: string; title: string; deck: string }[];
  defaultTab?: Tab;
  panelTitle?: string;
  panelSubtitle?: string;
}) {
  const t = useTranslations("V4.workspace.explore");
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<Tab>(defaultTab ?? "routes");
  const [mapRegion, setMapRegion] = useState<"seoul_core" | "han_river" | "gangnam">("seoul_core");
  const [filterKey, setFilterKey] = useState<string | null>(null);

  const filteredRoutes = useMemo(() => {
    if (!filterKey) return routes;
    return routes.filter((r) => r.summary.toLowerCase().includes(filterKey) || r.title.toLowerCase().includes(filterKey));
  }, [routes, filterKey]);

  const filteredSpots = useMemo(() => {
    if (!filterKey) return spots;
    return spots.filter(
      (s) =>
        s.vibeTags.some((v) => v.toLowerCase().includes(filterKey)) ||
        s.name.toLowerCase().includes(filterKey) ||
        s.shortDescription.toLowerCase().includes(filterKey),
    );
  }, [spots, filterKey]);

  const tabBtn = (id: Tab, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => {
        setTab(id);
        router.replace(pathname);
      }}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
        tab === id
          ? "bg-[var(--text-strong)] text-[var(--text-on-brand)]"
          : "bg-card text-[var(--text-strong)]/80 ring-1 ring-[var(--border-default)] hover:bg-[var(--brand-primary-soft)]",
      )}
    >
      {label}
    </button>
  );

  const panelBody = (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">{tabBtn("routes", t("tabRoutes"))}{tabBtn("spots", t("tabSpots"))}{tabBtn("stories", t("tabStories"))}</div>

      <div>
        <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-widest uppercase">{t("filters")}</p>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilterKey((k) => (k === f ? null : f))}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium capitalize",
                filterKey === f
                  ? "bg-[var(--brand-trust-blue-soft)] text-[var(--brand-trust-blue)]"
                  : "bg-card ring-1 ring-[var(--border-default)] hover:bg-[var(--bg-surface-subtle)]",
              )}
            >
              {t(`filter.${f}`)}
            </button>
          ))}
        </div>
      </div>

      <ul className="space-y-2">
        {tab === "routes"
          ? filteredRoutes.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/explore/routes/${r.slug}`}
                  className="bg-card ring-border/55 block rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)] ring-1 transition-colors hover:bg-[var(--bg-surface-subtle)]"
                >
                  <p className="text-[var(--text-strong)] font-semibold">{r.title}</p>
                  <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed">{r.summary}</p>
                </Link>
              </li>
            ))
          : null}
        {tab === "spots"
          ? filteredSpots.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/explore/spots/${s.slug}`}
                  className="bg-card ring-border/55 block rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)] ring-1 transition-colors hover:bg-[var(--bg-surface-subtle)]"
                >
                  <p className="text-[var(--text-strong)] font-semibold">{s.name}</p>
                  <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed">{s.shortDescription}</p>
                </Link>
              </li>
            ))
          : null}
        {tab === "stories"
          ? stories.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/stories/${s.slug}`}
                  className="bg-card ring-border/55 block rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)] ring-1 transition-colors hover:bg-[var(--bg-surface-subtle)]"
                >
                  <p className="text-[var(--text-strong)] font-semibold">{s.title}</p>
                  <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed">{s.deck}</p>
                </Link>
              </li>
            ))
          : null}
      </ul>
    </div>
  );

  const registration: WorkspaceRegistration = {
    contextKey: "explore",
    panelTitle: panelTitle ?? t("title"),
    panelSubtitle: panelSubtitle ?? t("lead"),
    panelBody,
    panelHeaderActions: (
      <div className="flex gap-1">
        {(["seoul_core", "han_river", "gangnam"] as const).map((r) => (
          <button
            key={r}
            type="button"
            title={r}
            onClick={() => setMapRegion(r)}
            className={cn(
              "size-8 rounded-full text-[10px] font-bold",
              mapRegion === r ? "bg-[var(--text-strong)] text-[var(--text-on-brand)]" : "bg-card ring-1 ring-[var(--border-default)]",
            )}
          >
            {r === "seoul_core" ? "S" : r === "han_river" ? "R" : "G"}
          </button>
        ))}
      </div>
    ),
    map: <FullBleedAmbientMap region={mapRegion} className="h-full w-full" />,
    initialSheetSnap: "half",
  };

  return <WorkspaceBinder registration={registration} />;
}
