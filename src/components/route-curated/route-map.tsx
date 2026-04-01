"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { CuratedRouteMapInnerProps } from "@/components/route-curated/curated-route-map-inner";
import { RouteMapFault } from "@/components/route-curated/route-experience-states";
import { isNaverDynamicMapEnabled } from "@/lib/maps/map-display-mode";

const InnerLibre = dynamic(
  () => import("@/components/route-curated/curated-route-map-inner").then((m) => ({ default: m.CuratedRouteMapInner })),
  {
    ssr: false,
    loading: () => <div className="bg-muted/50 h-full min-h-[200px] w-full animate-pulse rounded-none lg:rounded-[var(--radius-card)]" aria-hidden />,
  },
);

const InnerNaver = dynamic(
  () =>
    import("@/components/route-curated/curated-route-map-naver-inner").then((m) => ({ default: m.CuratedRouteMapNaverInner })),
  {
    ssr: false,
    loading: () => <div className="bg-muted/50 h-full min-h-[200px] w-full animate-pulse rounded-none lg:rounded-[var(--radius-card)]" aria-hidden />,
  },
);

/**
 * Route map: **Naver Dynamic Map** when `NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID` is set (and mock off), else **MapLibre**.
 * Directions 5 stays server-only; use `requestDirections` from `@/lib/routing/directions-request.action`.
 */
export function RouteMap(props: CuratedRouteMapInnerProps) {
  const t = useTranslations("V4.routeMap.states");
  const [mapErr, setMapErr] = useState<string | null>(null);
  const retry = useCallback(() => setMapErr(null), []);
  const useNaver = isNaverDynamicMapEnabled();

  if (process.env.NEXT_PUBLIC_MAP_PROVIDER === "schematic") {
    return (
      <div className="bg-muted/40 text-muted-foreground flex h-full min-h-[200px] items-center justify-center px-4 text-center text-sm">
        {t("schematicMode")}
      </div>
    );
  }

  if (mapErr) {
    return (
      <RouteMapFault
        className="rounded-none lg:rounded-[var(--radius-card)]"
        message={t("mapLoadFailed", { detail: mapErr })}
        onRetry={retry}
        retryLabel={t("retryMap")}
      />
    );
  }

  return useNaver ? (
    <InnerNaver {...props} onMapError={(msg) => setMapErr(msg)} />
  ) : (
    <InnerLibre {...props} onMapError={(msg) => setMapErr(msg)} />
  );
}
