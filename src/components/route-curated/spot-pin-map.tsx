"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTranslations } from "next-intl";
import { isNaverDynamicMapEnabled } from "@/lib/maps/map-display-mode";
import { getMapStyleUrl } from "@/lib/maps/map-style";
import { cn } from "@/lib/utils";

const SpotPinMapNaver = dynamic(
  () => import("@/components/route-curated/spot-pin-map-naver").then((m) => ({ default: m.SpotPinMapNaver })),
  { ssr: false, loading: () => <div className="bg-muted/50 min-h-[200px] w-full animate-pulse rounded-[var(--radius-card)]" aria-hidden /> },
);

export function SpotPinMap({
  lat,
  lng,
  label,
  className,
  loading,
  error,
}: {
  lat: number;
  lng: number;
  label: string;
  className?: string;
  loading?: boolean;
  error?: string | null;
}) {
  const t = useTranslations("V4.routeMap.states");
  const ref = useRef<HTMLDivElement>(null);
  const [mapErr, setMapErr] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isNaverDynamicMapEnabled()) return;
    if (process.env.NEXT_PUBLIC_MAP_PROVIDER === "schematic" || loading || error) return;
    const container = ref.current;
    if (!container) return;

    const map = new maplibregl.Map({
      container,
      style: getMapStyleUrl(),
      center: [lng, lat],
      zoom: 14,
      attributionControl: {},
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("error", (e) => {
      setMapErr(e.error?.message ?? "Map error");
    });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(container);

    map.on("load", () => {
      const el = document.createElement("div");
      el.className =
        "flex size-4 rounded-full border-2 border-[var(--bg-surface)] bg-[hsl(220_55%_36%)] shadow-md ring-2 ring-[hsl(220_55%_36%)]/30";
      el.setAttribute("aria-label", label);
      new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([lng, lat]).addTo(map);
      map.fitBounds(
        [
          [lng - 0.006, lat - 0.006],
          [lng + 0.006, lat + 0.006],
        ],
        { padding: 48, maxZoom: 15, duration: 0 },
      );
    });

    return () => {
      ro.disconnect();
      map.remove();
    };
  }, [lat, lng, label, loading, error]);

  if (mapErr) {
    return (
      <div
        className={cn(
          "text-muted-foreground flex min-h-[200px] items-center justify-center rounded-[var(--radius-card)] bg-[var(--warning-soft)] px-4 text-center text-sm",
          className,
        )}
        role="alert"
      >
        {t("mapLoadFailed", { detail: mapErr })}
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className={cn("bg-muted/50 min-h-[200px] w-full animate-pulse rounded-[var(--radius-card)]", className)}
        aria-busy
      />
    );
  }
  if (error) {
    return (
      <div
        className={cn(
          "text-muted-foreground flex min-h-[160px] items-center justify-center rounded-[var(--radius-card)] bg-[var(--warning-soft)] px-4 text-center text-sm",
          className,
        )}
        role="alert"
      >
        {error}
      </div>
    );
  }

  if (process.env.NEXT_PUBLIC_MAP_PROVIDER === "schematic") {
    return (
      <div
        className={cn(
          "text-muted-foreground flex min-h-[200px] items-center justify-center rounded-[var(--radius-card)] bg-[var(--bg-surface-subtle)] px-4 text-center text-sm",
          className,
        )}
      >
        {t("schematicMode")}
      </div>
    );
  }

  if (isNaverDynamicMapEnabled()) {
    return <SpotPinMapNaver lat={lat} lng={lng} label={label} className={className} loading={loading} error={error} />;
  }

  return (
    <div
      ref={ref}
      className={cn("h-[220px] min-h-[200px] w-full overflow-hidden rounded-[var(--radius-card)] [&_.maplibregl-ctrl]:m-2", className)}
      role="region"
      aria-label={label}
    />
  );
}
