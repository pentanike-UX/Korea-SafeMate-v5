"use client";

import dynamic from "next/dynamic";
import { RouteMapSchematic } from "@/components/maps/route-map-schematic";
import type { RouteMapPreviewProps } from "@/components/maps/route-map-types";
import { isNaverDynamicMapEnabled } from "@/lib/maps/map-display-mode";

export type { RouteMapPreviewProps };

const RouteMapLibreDynamic = dynamic(
  () => import("@/components/maps/route-map-libre-inner").then((mod) => ({ default: mod.RouteMapLibreInner })),
  {
    ssr: false,
    loading: () => <div className="bg-muted/50 h-full min-h-[120px] w-full animate-pulse rounded-md" aria-hidden />,
  },
);

const RouteMapNaverDynamic = dynamic(
  () => import("@/components/maps/route-map-naver-inner").then((mod) => ({ default: mod.RouteMapNaverInner })),
  {
    ssr: false,
    loading: () => <div className="bg-muted/50 h-full min-h-[120px] w-full animate-pulse rounded-md" aria-hidden />,
  },
);

/**
 * Interactive route map: **Naver Dynamic Map** when `NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID` is set (mock off),
 * else **MapLibre**. `NEXT_PUBLIC_MAP_PROVIDER=schematic` → SVG fallback.
 */
export function RouteMapPreview(props: RouteMapPreviewProps) {
  if (process.env.NEXT_PUBLIC_MAP_PROVIDER === "schematic") {
    return <RouteMapSchematic {...props} />;
  }
  if (isNaverDynamicMapEnabled()) {
    return <RouteMapNaverDynamic {...props} />;
  }
  return <RouteMapLibreDynamic {...props} />;
}
