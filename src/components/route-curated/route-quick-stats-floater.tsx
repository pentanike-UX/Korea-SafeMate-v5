"use client";

import { cn } from "@/lib/utils";

export function RouteQuickStatsFloater({
  distanceMeters,
  durationMinutes,
  className,
}: {
  distanceMeters: number;
  durationMinutes: number;
  className?: string;
}) {
  const km = Math.max(0, distanceMeters) / 1000;
  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-3 z-10 max-w-[min(100%,18rem)] sm:left-4 lg:bottom-8",
        className,
      )}
    >
      <div
        className={cn(
          "border-border/50 bg-[color-mix(in_srgb,var(--bg-surface)_94%,transparent)] text-[var(--text-strong)] pointer-events-auto rounded-full border px-3.5 py-2 text-[11px] font-semibold tracking-tight shadow-[0_16px_40px_rgba(15,23,42,0.07)] backdrop-blur-md sm:text-xs",
        )}
      >
        {km >= 0.1 ? `${km < 10 ? km.toFixed(1) : Math.round(km)} km` : "—"} · {Math.max(1, durationMinutes)} min
      </div>
    </div>
  );
}
