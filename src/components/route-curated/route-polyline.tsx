"use client";

import { cn } from "@/lib/utils";

export { latLngPathToLngLatCoords, routePolylineFeature } from "@/components/route-curated/route-polyline-geo";

/**
 * Status shell for route path data (geometry itself is drawn by `RouteMap` / MapLibre).
 * Use when a parent needs explicit loading / empty / error affordances outside the map.
 */
export function RoutePolyline({
  loading,
  error,
  empty,
  className,
}: {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  className?: string;
}) {
  if (loading) {
    return (
      <div
        className={cn("bg-muted/40 h-2 w-full max-w-xs animate-pulse rounded-full", className)}
        aria-busy
        aria-label="Loading route path"
      />
    );
  }
  if (error) {
    return (
      <p className={cn("text-destructive text-xs font-medium", className)} role="alert">
        {error}
      </p>
    );
  }
  if (empty) {
    return <p className={cn("text-muted-foreground text-xs", className)}>No walking path for this view.</p>;
  }
  return null;
}
