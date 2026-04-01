"use client";

import { RouteQuickStatsFloater } from "@/components/route-curated/route-quick-stats-floater";
import { cn } from "@/lib/utils";

/** Map-attached distance / duration chip; positions for workspace (tab bar + sheet safe). */
export function MapOverlayStats({
  distanceMeters,
  durationMinutes,
  className,
}: {
  distanceMeters: number;
  durationMinutes: number;
  className?: string;
}) {
  return (
    <RouteQuickStatsFloater
      distanceMeters={distanceMeters}
      durationMinutes={durationMinutes}
      className={cn("bottom-[calc(4.5rem+env(safe-area-inset-bottom))] lg:bottom-8", className)}
    />
  );
}
