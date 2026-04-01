"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type { RouteMapPreviewProps } from "@/components/maps/route-map-types";
import type { MapLatLng } from "@/types/domain";
import { getNaverMapsNcpClientId } from "@/lib/maps/map-display-mode";
import { loadNaverMapsScript } from "@/lib/maps/naver-maps-script";
import { naverFitMapToLatLngs } from "@/lib/maps/naver-map-camera";
import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NMaps = any;

function lineLngLats(path: MapLatLng[], spots: RouteMapPreviewProps["spots"]): [number, number][] {
  if (path.length >= 2) return path.map((p) => [p.lng, p.lat]);
  return [...spots].sort((a, b) => a.order - b.order).map((s) => [s.lng, s.lat]);
}

type PreviewBag = { line?: NMaps; markers?: NMaps[] };

function getBag(map: unknown): PreviewBag {
  const m = map as { __sfPreviewBag?: PreviewBag };
  if (!m.__sfPreviewBag) m.__sfPreviewBag = {};
  return m.__sfPreviewBag;
}

function applyOverlay(maps: NMaps, map: NMaps, p: RouteMapPreviewProps) {
  const { spots, path, selectedSpotId, onSpotSelect } = p;
  const bag = getBag(map);
  const coords = lineLngLats(path, spots);
  const hasLine = coords.length >= 2;
  const pathNaver = coords.map(([lng, lat]) => new maps.LatLng(lat, lng));

  if (!bag.line) {
    bag.line = new maps.Polyline({
      map,
      path: pathNaver,
      strokeColor: "hsl(220 65% 42%)",
      strokeWeight: 4,
      strokeOpacity: 0.9,
      clickable: false,
    });
  } else {
    bag.line.setPath(pathNaver);
  }
  bag.line.setMap(hasLine ? map : null);

  bag.markers?.forEach((mk) => mk.setMap(null));
  bag.markers = [];
  const sorted = [...spots].sort((a, b) => a.order - b.order);
  sorted.forEach((s) => {
    const selected = s.id === selectedSpotId;
    const el = document.createElement("button");
    el.type = "button";
    el.className = cn(
      "route-spot-pin flex size-8 cursor-pointer items-center justify-center rounded-full border-2 text-xs font-bold shadow-md transition-transform outline-none focus-visible:ring-2 focus-visible:ring-ring",
      selected
        ? "border-background z-10 scale-110 bg-[hsl(220_65%_42%)] text-white"
        : "border-foreground/25 bg-card text-foreground hover:scale-105",
    );
    el.textContent = String(s.order + 1);
    el.setAttribute("aria-label", `Stop ${s.order + 1}`);
    el.addEventListener("click", (ev) => {
      ev.stopPropagation();
      onSpotSelect?.(s.id);
    });
    bag.markers!.push(
      new maps.Marker({
        position: new maps.LatLng(s.lat, s.lng),
        map,
        icon: {
          content: el,
          anchor: new maps.Point(16, 16),
        },
      }),
    );
  });

  const pointsForBounds: MapLatLng[] = path.length >= 2 ? path : spots.map((x) => ({ lat: x.lat, lng: x.lng }));
  if (pointsForBounds.length > 0) {
    naverFitMapToLatLngs(maps, map, pointsForBounds, { maxZoom: 16 });
  } else {
    map.setCenter(new maps.LatLng(37.5665, 126.978));
    map.setZoom(11);
  }
}

export function RouteMapNaverInner(props: RouteMapPreviewProps) {
  const { spots, path, selectedSpotId, onSpotSelect, onMapClick, className, mapClickEnabled } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<NMaps | null>(null);
  const propsRef = useRef(props);
  useLayoutEffect(() => {
    propsRef.current = props;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const clientId = getNaverMapsNcpClientId();
    if (!clientId) return;

    let cancelled = false;
    let ro: ResizeObserver | null = null;
    let clickHandle: unknown;
    let idleOnceHandle: unknown;

    void loadNaverMapsScript(clientId).then(() => {
      if (cancelled || !containerRef.current) return;
      const maps = window.naver?.maps;
      if (!maps) return;

      const map = new maps.Map(containerRef.current, {
        center: new maps.LatLng(37.5665, 126.978),
        zoom: 12,
        zoomControl: true,
        zoomControlOptions: { position: maps.Position.TOP_RIGHT },
      });
      mapRef.current = map;

      clickHandle = maps.Event.addListener(map, "click", (...args: unknown[]) => {
        const e = args[0] as {
          coord?: { lat: () => number; lng: () => number };
          originalEvent?: MouseEvent;
        };
        const { mapClickEnabled: pick, onMapClick: cb } = propsRef.current;
        if (!pick || !cb) return;
        const domEvent = e.originalEvent;
        if (domEvent?.target instanceof Element && domEvent.target.closest(".route-spot-pin")) return;
        const c = e.coord;
        if (!c) return;
        cb(c.lat(), c.lng());
      });

      ro = new ResizeObserver(() => map.refresh());
      ro.observe(containerRef.current);

      let didApply = false;
      idleOnceHandle = maps.Event.addListener(map, "idle", () => {
        if (didApply || cancelled) return;
        didApply = true;
        applyOverlay(maps, map, propsRef.current);
      });
    });

    return () => {
      cancelled = true;
      ro?.disconnect();
      const map = mapRef.current;
      mapRef.current = null;
      if (map && window.naver?.maps?.Event) {
        if (clickHandle) window.naver.maps.Event.removeListener(clickHandle);
        if (idleOnceHandle) window.naver.maps.Event.removeListener(idleOnceHandle);
      }
      if (map) {
        const bag = getBag(map);
        bag.line?.setMap(null);
        bag.markers?.forEach((m) => m.setMap(null));
        if (typeof map.destroy === "function") map.destroy();
      }
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (el) el.style.cursor = mapClickEnabled ? "crosshair" : "";
  }, [mapClickEnabled]);

  useEffect(() => {
    const map = mapRef.current;
    const maps = window.naver?.maps;
    if (!map || !maps) return;
    applyOverlay(maps, map, { spots, path, selectedSpotId, onSpotSelect, onMapClick, className, mapClickEnabled });
  }, [spots, path, selectedSpotId, onSpotSelect, onMapClick, className, mapClickEnabled]);

  return <div ref={containerRef} className={cn("h-full min-h-[160px] w-full overflow-hidden", className)} />;
}
