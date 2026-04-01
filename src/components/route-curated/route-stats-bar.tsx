"use client";

import { Clock, Footprints, Route } from "lucide-react";
import { cn } from "@/lib/utils";

export function RouteStatsBar({
  durationMinutes,
  distanceKm,
  stopCount,
  transportLabel,
  className,
  loading,
  error,
}: {
  durationMinutes: number;
  distanceKm: number;
  stopCount: number;
  transportLabel: string;
  className?: string;
  loading?: boolean;
  error?: string | null;
}) {
  if (error) {
    return (
      <div className={cn("text-destructive rounded-[var(--radius-lg)] bg-[var(--error-soft)] px-3 py-2 text-xs font-medium", className)}>
        {error}
      </div>
    );
  }
  if (loading) {
    return <div className={cn("bg-muted/80 h-11 animate-pulse rounded-[var(--radius-lg)]", className)} aria-hidden />;
  }

  const items = [
    { Icon: Clock, text: `${durationMinutes} min` },
    { Icon: Route, text: `${stopCount} stops` },
    { Icon: Footprints, text: `${distanceKm.toFixed(1)} km · ${transportLabel}` },
  ];

  return (
    <div
      className={cn(
        "text-[var(--text-strong)] flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[var(--radius-lg)] bg-[color-mix(in_srgb,var(--bg-surface)_92%,transparent)] px-3 py-2 text-xs font-medium shadow-sm ring-1 ring-[var(--border-default)] backdrop-blur-md tabular-nums",
        className,
      )}
    >
      {items.map(({ Icon, text }) => (
        <span key={text} className="inline-flex items-center gap-1.5">
          <Icon className="text-[var(--brand-trust-blue)] size-3.5 shrink-0 opacity-90" strokeWidth={1.75} aria-hidden />
          {text}
        </span>
      ))}
    </div>
  );
}
