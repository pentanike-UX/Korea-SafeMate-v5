"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { Map } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { PathSegment, RouteStop } from "@/domain/curated-experience";
import { getMapStyleUrl } from "@/lib/maps/map-style";
import { createRouteStopMarkerElement } from "@/components/route-curated/route-marker";
import { latLngPathToLngLatCoords, routePolylineFeature } from "@/components/route-curated/route-polyline-geo";
import { mergePathSegments, segmentHighlightForStop } from "@/lib/route-curated/geometry";
import { easeMapToStop, fitMapToLatLngs, pathCoordsFingerprint } from "@/lib/route-curated/map-camera";
import { normalizePathSegments } from "@/lib/route-curated/normalize-path-segments";
import { cn } from "@/lib/utils";

const BASE_SRC = "curated-route-base";
const HI_SRC = "curated-route-highlight";
const BASE_LAYER = "curated-route-base-line";
const HI_LAYER = "curated-route-highlight-line";

export type CuratedMapStop = {
  id: string;
  order: number;
  lat: number;
  lng: number;
  title: string;
};

export type CuratedRouteMapInnerProps = {
  stops: CuratedMapStop[];
  routeStops: RouteStop[];
  pathSegments: PathSegment[];
  viewMode: "full" | "segment";
  activeStopId: string | null;
  onStopSelect?: (stopId: string) => void;
  className?: string;
  mapKey: string;
  onMapError?: (message: string) => void;
};

function applyRouteGeometry(
  map: Map,
  p: Omit<CuratedRouteMapInnerProps, "className" | "onMapError">,
  fullPathCoords: [number, number][],
  normalizedSegments: PathSegment[],
) {
  const { stops, routeStops, viewMode, activeStopId, onStopSelect } = p;

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
  const baseCoords = showSegmentOnly ? [] : fullPathCoords;
  const highlightCoords = hiCoords.length >= 2 ? hiCoords : [];

  const baseData = routePolylineFeature(baseCoords);
  const hiData = routePolylineFeature(highlightCoords.length >= 2 ? highlightCoords : []);

  if (!map.getSource(BASE_SRC)) {
    map.addSource(BASE_SRC, { type: "geojson", data: baseData });
    map.addLayer({
      id: BASE_LAYER,
      type: "line",
      source: BASE_SRC,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "hsl(220 14% 76%)",
        "line-width": 4,
        "line-opacity": 0.42,
      },
    });
  } else {
    (map.getSource(BASE_SRC) as maplibregl.GeoJSONSource).setData(baseData);
  }

  if (!map.getSource(HI_SRC)) {
    map.addSource(HI_SRC, { type: "geojson", data: hiData });
    map.addLayer({
      id: `${HI_LAYER}-glow`,
      type: "line",
      source: HI_SRC,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "hsl(18 92% 46%)",
        "line-width": viewMode === "segment" ? 15 : 14,
        "line-opacity": 0.22,
        "line-blur": 1.2,
      },
    });
    map.addLayer({
      id: HI_LAYER,
      type: "line",
      source: HI_SRC,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "hsl(18 92% 46%)",
        "line-width": viewMode === "segment" ? 9 : 8,
        "line-opacity": 1,
      },
    });
  } else {
    (map.getSource(HI_SRC) as maplibregl.GeoJSONSource).setData(hiData);
    map.setPaintProperty(HI_LAYER, "line-width", viewMode === "segment" ? 9 : 8);
    const glowId = `${HI_LAYER}-glow`;
    if (map.getLayer(glowId)) {
      map.setPaintProperty(glowId, "line-width", viewMode === "segment" ? 15 : 14);
    }
  }

  if (map.getLayer(BASE_LAYER)) {
    map.setLayoutProperty(BASE_LAYER, "visibility", showFullBase ? "visible" : "none");
  }
  if (map.getLayer(HI_LAYER)) {
    const vis = highlightCoords.length >= 2 ? "visible" : "none";
    map.setLayoutProperty(HI_LAYER, "visibility", vis);
    const glowId = `${HI_LAYER}-glow`;
    if (map.getLayer(glowId)) {
      map.setLayoutProperty(glowId, "visibility", vis);
    }
  }

  const markersRef = (map as unknown as { __crMarkers?: maplibregl.Marker[] }).__crMarkers ?? [];
  markersRef.forEach((m) => m.remove());
  const nextMarkers: maplibregl.Marker[] = [];
  (map as unknown as { __crMarkers?: maplibregl.Marker[] }).__crMarkers = nextMarkers;

  const sorted = [...stops].sort((a, b) => a.order - b.order);
  sorted.forEach((s) => {
    const selected = s.id === activeStopId;
    const el = createRouteStopMarkerElement({
      order: s.order,
      title: s.title,
      selected,
      onSelect: () => onStopSelect?.(s.id),
    });
    nextMarkers.push(new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([s.lng, s.lat]).addTo(map));
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

export function CuratedRouteMapInner({
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
  const mapRef = useRef<Map | null>(null);
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

    let cancelled = false;
    const map = new maplibregl.Map({
      container,
      style: getMapStyleUrl(),
      center: [126.978, 37.5665],
      zoom: 12,
      attributionControl: {},
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    map.on("error", (e) => {
      onMapError?.(e.error?.message ?? "Map error");
    });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(container);

    map.on("load", () => {
      if (!cancelled) setMapReady(true);
    });

    return () => {
      cancelled = true;
      ro.disconnect();
      const markers = (map as unknown as { __crMarkers?: maplibregl.Marker[] }).__crMarkers;
      markers?.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
      setMapReady(false);
      cameraRef.current = { mapKey: "", viewMode: "full", pathFp: "", activeStopId: null };
    };
  }, [mapKey, onMapError]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded() || !mapReady) return;

    const p = propsRef.current;
    applyRouteGeometry(map, p, fullPathCoords, normalizedSegments);

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
      fitMapToLatLngs(map, pts, { padding: 72 });
      return;
    }

    if (cr.activeStopId !== p.activeStopId) {
      cr.activeStopId = p.activeStopId;
      if (p.activeStopId) {
        const s = sorted.find((x) => x.id === p.activeStopId);
        if (s) easeMapToStop(map, s.lng, s.lat);
      }
    }
  }, [mapReady, mapKey, viewMode, fullPathCoords, normalizedSegments, activeStopId, stops, routeStops]);

  return (
    <div
      ref={containerRef}
      className={cn("h-full min-h-[200px] w-full overflow-hidden [&_.maplibregl-ctrl]:m-2", className)}
      role="region"
      aria-label="Route map"
    />
  );
}
