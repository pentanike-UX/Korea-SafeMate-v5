"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getMapStyleUrl } from "@/lib/maps/map-style";
import { isNaverDynamicMapEnabled } from "@/lib/maps/map-display-mode";
import { cn } from "@/lib/utils";

type RegionPreset = "seoul_core" | "han_river" | "gangnam";

const REGION: Record<RegionPreset, { lat: number; lng: number; zoom: number }> = {
  seoul_core: { lat: 37.5665, lng: 126.978, zoom: 11.2 },
  han_river: { lat: 37.53, lng: 126.99, zoom: 11.4 },
  gangnam: { lat: 37.498, lng: 127.028, zoom: 11.6 },
};

const NaverAmbient = dynamic(() => import("./full-bleed-ambient-map-naver").then((m) => ({ default: m.FullBleedAmbientMapNaver })), {
  ssr: false,
  loading: () => <div className="bg-muted/30 h-full w-full animate-pulse" aria-hidden />,
});

/**
 * Full-bleed map for home / planner (no route geometry). Region presets pan the camera.
 */
export function FullBleedAmbientMap({
  region,
  className,
}: {
  region: RegionPreset;
  className?: string;
}) {
  if (process.env.NEXT_PUBLIC_MAP_PROVIDER === "schematic") {
    return (
      <div className={cn("bg-muted/50 text-muted-foreground flex h-full w-full items-center justify-center px-6 text-center text-sm", className)}>
        Map preview unavailable (schematic mode).
      </div>
    );
  }

  if (isNaverDynamicMapEnabled()) {
    return <NaverAmbient region={region} className={className} />;
  }

  return <AmbientMapLibre region={region} className={className} />;
}

function AmbientMapLibre({
  region,
  className,
}: {
  region: RegionPreset;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = ref.current;
    if (!el) return;
    const start = REGION.seoul_core;
    const map = new maplibregl.Map({
      container: el,
      style: getMapStyleUrl(),
      center: [start.lng, start.lat],
      zoom: start.zoom,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.on("error", (e) => setErr(e.error?.message ?? "Map error"));
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(el);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const { lat, lng, zoom } = REGION[region];
    const apply = () => map.flyTo({ center: [lng, lat], zoom, duration: 600, essential: true });
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [region]);

  if (err) {
    return (
      <div className={cn("bg-muted/40 text-muted-foreground flex h-full w-full items-center justify-center px-4 text-center text-sm", className)}>{err}</div>
    );
  }

  return <div ref={ref} className={cn("h-full w-full [&_.maplibregl-ctrl]:m-2", className)} />;
}
