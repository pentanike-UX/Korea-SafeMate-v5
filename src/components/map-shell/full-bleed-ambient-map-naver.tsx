"use client";

import { useEffect, useRef, useState } from "react";
import { loadNaverMapsScript } from "@/lib/maps/naver-maps-script";
import { getNaverMapsNcpClientId } from "@/lib/maps/map-display-mode";
import { cn } from "@/lib/utils";

type RegionPreset = "seoul_core" | "han_river" | "gangnam";

const REGION: Record<RegionPreset, { lat: number; lng: number; zoom: number }> = {
  seoul_core: { lat: 37.5665, lng: 126.978, zoom: 11 },
  han_river: { lat: 37.53, lng: 126.99, zoom: 11 },
  gangnam: { lat: 37.498, lng: 127.028, zoom: 11 },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NMaps = any;

export function FullBleedAmbientMapNaver({
  region,
  className,
}: {
  region: RegionPreset;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<NMaps | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const clientId = getNaverMapsNcpClientId();

  useEffect(() => {
    if (!clientId) {
      return;
    }
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    let ro: ResizeObserver | null = null;

    void loadNaverMapsScript(clientId)
      .then(() => {
        if (cancelled || !ref.current) return;
        const maps = window.naver?.maps;
        if (!maps) {
          setErr("Naver SDK missing");
          return;
        }
        const start = REGION.seoul_core;
        const map = new maps.Map(ref.current, {
          center: new maps.LatLng(start.lat, start.lng),
          zoom: start.zoom,
          zoomControl: false,
        });
        mapRef.current = map;
        ro = new ResizeObserver(() => map.refresh());
        ro.observe(ref.current);
      })
      .catch((e: Error) => setErr(e?.message ?? "Map load failed"));

    return () => {
      cancelled = true;
      ro?.disconnect();
      const m = mapRef.current;
      mapRef.current = null;
      if (m && typeof m.destroy === "function") m.destroy();
    };
  }, [clientId]);

  useEffect(() => {
    const map = mapRef.current;
    const maps = window.naver?.maps;
    if (!map || !maps) return;
    const { lat, lng, zoom } = REGION[region];
    const ll = new maps.LatLng(lat, lng);
    if (typeof map.morph === "function") {
      map.morph(ll, zoom, { duration: 500 });
    } else {
      map.setCenter(ll);
      map.setZoom(zoom, true);
    }
  }, [region]);

  if (!clientId) {
    return <div className={cn("bg-muted/40 flex h-full w-full items-center justify-center px-4 text-center text-sm", className)}>Missing map client ID</div>;
  }

  if (err) {
    return <div className={cn("bg-muted/40 flex h-full w-full items-center justify-center px-4 text-center text-sm", className)}>{err}</div>;
  }

  return <div ref={ref} className={cn("h-full w-full", className)} />;
}
