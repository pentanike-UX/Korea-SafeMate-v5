"use client";

import { RouteBottomSheet } from "@/components/route-curated/route-bottom-sheet";
import { cn } from "@/lib/utils";

const panelSurface =
  "border-border/55 bg-[color-mix(in_srgb,var(--bg-surface)_97%,transparent)] shadow-[0_28px_72px_rgba(15,23,42,0.08)]";

/**
 * Full-viewport route map + overlay panel (mobile bottom sheet / desktop floating card).
 */
export function FullScreenRouteShell({
  map,
  mapOverlays,
  panel,
  footer,
  initialSnap = "half",
}: {
  map: React.ReactNode;
  mapOverlays?: React.ReactNode;
  panel: React.ReactNode;
  footer: React.ReactNode;
  initialSnap?: "collapsed" | "half" | "full";
}) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0 z-0">{map}</div>

      {mapOverlays ? (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-10 px-3 sm:top-4 sm:px-4">
          <div className="pointer-events-auto mx-auto flex w-full max-w-5xl flex-wrap items-start justify-between gap-2">{mapOverlays}</div>
        </div>
      ) : null}

      <aside
        className={cn(
          panelSurface,
          "hidden h-[min(100dvh-6rem,calc(100dvh-4rem))] w-[min(420px,calc(100vw-3rem))] flex-col overflow-hidden rounded-[26px] border lg:absolute lg:top-4 lg:right-4 lg:bottom-6 lg:z-20 lg:flex",
        )}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">{panel}</div>
        <div className="border-border/50 shrink-0 border-t px-5 py-4">{footer}</div>
      </aside>

      <div className="lg:hidden">
        <RouteBottomSheet initialSnap={initialSnap} footer={footer} className={cn(panelSurface, "rounded-t-[26px] border-x border-t")}>
          {panel}
        </RouteBottomSheet>
      </div>
    </div>
  );
}
