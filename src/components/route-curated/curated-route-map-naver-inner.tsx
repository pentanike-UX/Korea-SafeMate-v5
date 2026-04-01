"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CuratedMapStop, CuratedRouteMapInnerProps } from "@/components/route-curated/curated-route-map-inner";
import type { PathSegment } from "@/domain/curated-experience";
import { createRouteStopMarkerElement } from "@/components/route-curated/route-marker";
import { latLngPathToLngLatCoords, routePolylineFeature } from "@/components/route-curated/route-polyline-geo";
import { mergePathSegments, segmentHighlightForStop } from "@/lib/route-curated/geometry";
import { naverEaseMapToStop, naverFitMapToLatLngs } from "@/lib/maps/naver-map-camera";
import { getNaverMapsNcpClientId } from "@/lib/maps/map-display-mode";
import { loadNaverMapsScript } from "@/lib/maps/naver-maps-script";
import { pathCoordsFingerprint } from "@/lib/route-curated/map-camera";
import { normalizePathSegments } from "@/lib/route-curated/normalize-path-segments";
import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NMaps = any;

type OverlayBag = {
  base?: { setMap: (m: unknown) => void; setPath: (p: unknown[]) => void };
  glow?: { setMap: (m: unknown) => void; setPath: (p: unknown[]) => void };
  hi?: { setMap: (m: unknown) => void; setPath: (p: unknown[]) => void };
  markers?: { setMap: (m: unknown) => void }[];
};

function getBag(map: unknown): OverlayBag {
  const m = map as { __sfNaverBag?: OverlayBag };
  if (!m.__sfNaverBag) m.__sfNaverBag = {};
  return m.__sfNaverBag;
}

function coordsToNaverPath(maps: NMaps, coords: [number, number][]) {
  return coords.map(([lng, lat]) => new maps.LatLng(lat, lng));
}

function lineStringToLngLat(line: GeoJSON.Feature<GeoJSON.LineString>): [number, number][] {
  const c = line.geometry?.coordinates;
  if (!c?.length) return [];
  return c as [number, number][];
}

function applyRouteGeometryNaver(
  maps: NMaps,
  map: NMaps,
  p: Omit<CuratedRouteMapInnerProps, "className" | "onMapError">,
  fullPathCoords: [number, number][],
  normalizedSegments: PathSegment[],
) {
  const { stops, routeStops, viewMode, activeStopId, onStopSelect } = p;
  const bag = getBag(map);

  const activeRouteStop =
    activeStopId && routeStops.length ? routeStops.find((s) => s.id === activeStopId) ?? null : null;
  const hiSeg =
    activeRouteStop && normalizedSegments.length
      ? segmentHighlightForStop(activeRouteStop, normalizedSegments)
      : null;
  const hiCoords: [number, number][] =
    hiSeg && hiSeg.polyline.length >= 2 ? hiSeg.polyline.map((x) => [x.lng, x.lat]) : [];

  const showFullBase = viewMode === "full" && fullPathCoords.length >= 2;
  const showSegmentOnly = viewMode === "segment";
  const baseLngLat = showSegmentOnly ? [] : fullPathCoords;
  const highlightLngLat = hiCoords.length >= 2 ? hiCoords : [];

  const baseData = routePolylineFeature(baseLngLat);
  const hiData = routePolylineFeature(highlightLngLat.length >= 2 ? highlightLngLat : []);
  const basePath = coordsToNaverPath(maps, lineStringToLngLat(baseData));
  const hiPath = coordsToNaverPath(maps, lineStringToLngLat(hiData));

  if (!bag.base) {
    bag.base = new maps.Polyline({
      map,
      path: basePath,
      strokeColor: "hsl(220 14% 76%)",
      strokeWeight: 4,
      strokeOpacity: 0.42,
      clickable: false,
    }) as OverlayBag["base"];
  } else {
    bag.base.setPath(basePath);
  }
  bag.base!.setMap(showFullBase ? map : null);

  const segStroke = viewMode === "segment" ? 9 : 8;
  const glowStroke = viewMode === "segment" ? 15 : 14;

  if (!bag.glow) {
    bag.glow = new maps.Polyline({
      map,
      path: hiPath,
      strokeColor: "hsl(18 92% 46%)",
      strokeWeight: glowStroke,
      strokeOpacity: 0.22,
      clickable: false,
    }) as OverlayBag["glow"];
  } else {
    const g = bag.glow as { setOptions?: (o: { strokeWeight: number }) => void };
    g.setOptions?.({ strokeWeight: glowStroke });
    bag.glow.setPath(hiPath);
  }

  if (!bag.hi) {
    bag.hi = new maps.Polyline({
      map,
      path: hiPath,
      strokeColor: "hsl(18 92% 46%)",
      strokeWeight: segStroke,
      strokeOpacity: 1,
      clickable: false,
    }) as OverlayBag["hi"];
  } else {
    const h = bag.hi as { setOptions?: (o: { strokeWeight: number }) => void };
    h.setOptions?.({ strokeWeight: segStroke });
    bag.hi.setPath(hiPath);
  }

  const showHi = highlightLngLat.length >= 2;
  bag.glow!.setMap(showHi ? map : null);
  bag.hi!.setMap(showHi ? map : null);

  bag.markers?.forEach((mk) => mk.setMap(null));
  bag.markers = [];
  const sorted = [...stops].sort((a, b) => a.order - b.order);
  sorted.forEach((s) => {
    const selected = s.id === activeStopId;
    const el = createRouteStopMarkerElement({
      order: s.order,
      title: s.title,
      selected,
      onSelect: () => onStopSelect?.(s.id),
    });
    const marker = new maps.Marker({
      position: new maps.LatLng(s.lat, s.lng),
      map,
      icon: {
        content: el,
        anchor: new maps.Point(18, 18),
      },
    });
    bag.markers!.push(marker);
  });
}

function fitPointsForCamera(
  viewMode: "full" | "segment",
  fullPathCoords: [number, number][],
  highlightLngLat: [number, number][],
  sortedStops: CuratedMapStop[],
): { lng: number; lat: number }[] {
  if (viewMode === "segment" && highlightLngLat.length >= 2) {
    return highlightLngLat.map(([lng, lat]) => ({ lng, lat }));
  }
  if (fullPathCoords.length >= 2) {
    return fullPathCoords.map(([lng, lat]) => ({ lng, lat }));
  }
  return sortedStops.map((s) => ({ lng: s.lng, lat: s.lat }));
}

export function CuratedRouteMapNaverInner({
  stops,
  routeStops,
  pathSegments,
  viewMode,
  activeStopId,
  onStopSelect,
  className,
  mapKey,
  onMapError,
}: CuratedRouteMapInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<NMaps | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const propsRef = useRef({
    stops,
    routeStops,
    pathSegments,
    viewMode,
    activeStopId,
    onStopSelect,
    mapKey,
  });

  useLayoutEffect(() => {
    propsRef.current = {
      stops,
      routeStops,
      pathSegments,
      viewMode,
      activeStopId,
      onStopSelect,
      mapKey,
    };
  }, [stops, routeStops, pathSegments, viewMode, activeStopId, onStopSelect, mapKey]);

  const normalizedSegments = useMemo(() => normalizePathSegments(pathSegments), [pathSegments]);
  const fullPathCoords = useMemo(
    () => latLngPathToLngLatCoords(mergePathSegments(normalizedSegments)),
    [normalizedSegments],
  );

  const cameraRef = useRef({
    mapKey: "",
    viewMode: "full" as "full" | "segment",
    pathFp: "",
    activeStopId: null as string | null,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const container = containerRef.current;
    if (!container) return;

    const clientId = getNaverMapsNcpClientId();
    if (!clientId) {
      onMapError?.("NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID missing");
      return;
    }

    let cancelled = false;
    let ro: ResizeObserver | null = null;
    let initListener: unknown;
    let idleListener: unknown;

    void loadNaverMapsScript(clientId)
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const maps = window.naver?.maps;
        if (!maps) {
          onMapError?.("Naver Maps SDK missing");
          return;
        }

        const map = new maps.Map(containerRef.current, {
          center: new maps.LatLng(37.5665, 126.978),
          zoom: 12,
          zoomControl: true,
          zoomControlOptions: { position: maps.Position.TOP_RIGHT },
        });
        mapRef.current = map;

        const markReady = () => {
          if (!cancelled) setMapReady(true);
        };
        initListener = maps.Event.addListener(map, "init", markReady);
        idleListener = maps.Event.addListener(map, "idle", markReady);

        ro = new ResizeObserver(() => {
          map.refresh();
        });
        ro.observe(containerRef.current);
      })
      .catch((e: Error) => {
        if (!cancelled) onMapError?.(e?.message ?? "Naver Maps load failed");
      });

    return () => {
      cancelled = true;
      setMapReady(false);
      if (ro) ro.disconnect();
      const map = mapRef.current;
      mapRef.current = null;
      if (map && window.naver?.maps?.Event) {
        if (initListener) window.naver.maps.Event.removeListener(initListener);
        if (idleListener) window.naver.maps.Event.removeListener(idleListener);
      }
      if (map) {
        const bag = getBag(map);
        bag.base?.setMap(null);
        bag.glow?.setMap(null);
        bag.hi?.setMap(null);
        bag.markers?.forEach((m) => m.setMap(null));
        if (typeof map.destroy === "function") map.destroy();
      }
      cameraRef.current = { mapKey: "", viewMode: "full", pathFp: "", activeStopId: null };
    };
  }, [mapKey, onMapError]);

  useEffect(() => {
    const map = mapRef.current;
    const maps = window.naver?.maps;
    if (!map || !maps || !mapReady) return;

    const p = propsRef.current;
    applyRouteGeometryNaver(maps, map, p, fullPathCoords, normalizedSegments);

    const sorted = [...p.stops].sort((a, b) => a.order - b.order);
    const activeRouteStop =
      p.activeStopId && p.routeStops.length ? p.routeStops.find((s) => s.id === p.activeStopId) ?? null : null;
    const hiSeg =
      activeRouteStop && normalizedSegments.length
        ? segmentHighlightForStop(activeRouteStop, normalizedSegments)
        : null;
    const hiCoords: [number, number][] =
      hiSeg && hiSeg.polyline.length >= 2 ? hiSeg.polyline.map((x) => [x.lng, x.lat]) : [];

    const fp = pathCoordsFingerprint(fullPathCoords);
    const cr = cameraRef.current;
    const layoutChanged = cr.mapKey !== mapKey || cr.viewMode !== viewMode || cr.pathFp !== fp;

    if (layoutChanged) {
      cr.mapKey = mapKey;
      cr.viewMode = viewMode;
      cr.pathFp = fp;
      cr.activeStopId = p.activeStopId;
      const pts = fitPointsForCamera(viewMode, fullPathCoords, hiCoords, sorted);
      naverFitMapToLatLngs(maps, map, pts, { maxZoom: 15 });
      return;
    }

    if (cr.activeStopId !== p.activeStopId) {
      cr.activeStopId = p.activeStopId;
      if (p.activeStopId) {
        const s = sorted.find((x) => x.id === p.activeStopId);
        if (s) naverEaseMapToStop(maps, map, s.lng, s.lat);
      }
    }
  }, [mapReady, mapKey, viewMode, fullPathCoords, normalizedSegments, activeStopId, stops, routeStops]);

  return (
    <div
      ref={containerRef}
      className={cn("h-full min-h-[200px] w-full overflow-hidden [&_.NMap]:min-h-[200px]", className)}
      role="region"
      aria-label="Route map"
    />
  );
}
