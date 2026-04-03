"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { fetchV5PlanRouteGeometry } from "@/lib/v5/fetch-v5-plan-route.server";
import type { V5PlanRouteLegSummary } from "@/lib/v5/fetch-v5-plan-route.server";
import "maplibre-gl/dist/maplibre-gl.css";
import Image from "next/image";
import type { SpotTourEnrichment } from "@/lib/tour-api/tour-spot-client";
import { tourImageUnoptimized, tourSearchQuery } from "@/lib/tour-api/tour-spot-client";
import { V5TravelAiAnalysisLoadingOverlay } from "./v5-travel-ai-analysis-loading";
import {
  X,
  MapPin,
  Clock,
  CloudSun,
  Utensils,
  Coffee,
  Train,
  Camera,
  Hotel,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Maximize2,
  Minimize2,
  Map as MapIcon,
  ExternalLink,
  Star,
  ChevronRight,
  BookOpen,
  Landmark,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type SpotType = "attraction" | "food" | "cafe" | "transport" | "hotel";

type TransitMode = "surface" | "flight" | "ferry";

interface TravelSpot {
  id: string;
  name: string;
  type: SpotType;
  duration: string;
  note?: string;
  transitToNext?: string;
  /** 스팟 i → i+1 이동 (도로 라우팅 생략 시 블록 추정) */
  transitMode?: TransitMode;
  lat?: number;
  lng?: number;
}

interface TravelPlan {
  id: string;
  title: string;
  region: string;
  days: number;
  summary: string;
  spots: TravelSpot[];
  weatherNote?: string;
  totalTime?: string;
  alternativeNote?: string;
}

/** /api/v5/spot-enrichment 성공 페이로드 (위키백과 요약) */
interface SpotWikiEnrichment {
  title: string;
  displayTitle: string;
  extract: string;
  thumbnail: string | null;
  articleUrl: string;
}

// ─── Time / duration helpers ─────────────────────────────────────────────────

/** "HH:mm" → 분 단위 (자정 기준) */
function parseTimeToMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) return null;
  return h * 60 + min;
}

function minutesToHHmm(total: number): string {
  const t = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(t / 60);
  const m = t % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** 체류 시간(분): 스팟 duration 문구에서 추정 */
function parseStayMinutes(text: string): number {
  const s = text.trim();
  if (/박|숙소|호텔|체크인/i.test(s) && !/시간|분/.test(s)) return 0;
  const h = /(\d+(?:\.\d+)?)\s*시간/.exec(s);
  if (h) return Math.round(Number(h[1]) * 60);
  const hm = /(\d+)\s*시간\s*(\d+)\s*분/.exec(s);
  if (hm) return Number(hm[1]) * 60 + Number(hm[2]);
  const min = /(\d+)\s*분/.exec(s);
  if (min) return Number(min[1]);
  if (/당일|잠시|산책|경유/i.test(s)) return 45;
  return 60;
}

function formatLegDuration(sec: number | null): string {
  if (sec == null || !Number.isFinite(sec)) return "—";
  if (sec < 60) return `약 ${sec}초`;
  const m = Math.round(sec / 60);
  if (m < 60) return `약 ${m}분`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `약 ${h}시간 ${r}분` : `약 ${h}시간`;
}

// ─── Map chrome ────────────────────────────────────────────────────────────────

const SPOT_COLORS: Record<SpotType, { bg: string; text: string; hex: string }> = {
  attraction: { bg: "bg-blue-50", text: "text-blue-600", hex: "#2563eb" },
  food: { bg: "bg-orange-50", text: "text-orange-500", hex: "#f97316" },
  cafe: { bg: "bg-amber-50", text: "text-amber-600", hex: "#d97706" },
  transport: { bg: "bg-slate-100", text: "text-slate-500", hex: "#64748b" },
  hotel: { bg: "bg-purple-50", text: "text-purple-600", hex: "#9333ea" },
};

function SpotTypeIcon({ type, size = 14 }: { type: SpotType; size?: number }) {
  const sz = `w-[${size}px] h-[${size}px]`;
  const icons: Record<SpotType, React.ReactNode> = {
    attraction: <Camera className={sz} />,
    food: <Utensils className={sz} />,
    cafe: <Coffee className={sz} />,
    transport: <Train className={sz} />,
    hotel: <Hotel className={sz} />,
  };
  return <>{icons[type]}</>;
}

/**
 * MapLibre가 마커 루트에 `transform`으로 위치를 잡으므로, 스타일은 반드시 **자식**에만 적용합니다.
 * 루트에 `cssText`/`transform`을 쓰면 핀이 좌상단(0,0)으로 튑니다.
 */
function applyPinElement(
  el: HTMLDivElement,
  index: number,
  type: SpotType,
  selected: boolean,
) {
  const color = selected ? "#1c1c1e" : SPOT_COLORS[type].hex;
  el.style.width = "32px";
  el.style.height = "32px";
  el.style.background = selected ? "#1c1c1e" : "#fff";
  el.style.border = `2.5px solid ${color}`;
  el.style.borderRadius = "50%";
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.fontSize = "12px";
  el.style.fontWeight = "700";
  el.style.color = selected ? "#fff" : color;
  el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.18)";
  el.style.cursor = "pointer";
  el.style.pointerEvents = "auto";
  el.style.userSelect = "none";
  el.style.transform = "scale(1)";
  el.style.transformOrigin = "center center";
  el.textContent = String(index + 1);
  el.onmouseenter = () => {
    el.style.transform = "scale(1.08)";
  };
  el.onmouseleave = () => {
    el.style.transform = "scale(1)";
  };
}

// ─── Route helpers ─────────────────────────────────────────────────────────────

function straightLineFromSpots(spots: TravelSpot[]): [number, number][] {
  return spots
    .filter((s) => s.lat != null && s.lng != null && Number.isFinite(s.lat) && Number.isFinite(s.lng))
    .map((s) => [s.lng!, s.lat!] as [number, number]);
}

function boundsFromLngLats(coords: [number, number][]): maplibregl.LngLatBoundsLike | null {
  if (coords.length === 0) return null;
  let minLng = coords[0]![0];
  let maxLng = coords[0]![0];
  let minLat = coords[0]![1];
  let maxLat = coords[0]![1];
  for (const [lng, lat] of coords) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

function setRouteGeoJSON(map: maplibregl.Map, coordinates: [number, number][]) {
  const empty = {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "LineString" as const, coordinates: [] as [number, number][] },
  };
  const feature = {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "LineString" as const, coordinates },
  };
  const data = coordinates.length >= 2 ? feature : empty;

  const existing = map.getSource("route-src");
  if (existing?.type === "geojson") {
    (existing as maplibregl.GeoJSONSource).setData(data);
    return;
  }
  map.addSource("route-src", { type: "geojson", data });
  map.addLayer({
    id: "route-line",
    type: "line",
    source: "route-src",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#2f4f8f",
      "line-width": 5,
      "line-opacity": 0.92,
    },
  });
}

/** 항공·페리 구간: 대권 직선 + 점선 (도로와 구분) */
function setAirRouteGeoJSON(map: maplibregl.Map, lineSegments: [number, number][][]) {
  const features = lineSegments.map((coordinates) => ({
    type: "Feature" as const,
    properties: {},
    geometry: { type: "LineString" as const, coordinates },
  }));
  const data = {
    type: "FeatureCollection" as const,
    features,
  };
  const empty = { type: "FeatureCollection" as const, features: [] as typeof features };

  const existing = map.getSource("route-air-src");
  if (existing?.type === "geojson") {
    (existing as maplibregl.GeoJSONSource).setData(lineSegments.length ? data : empty);
    return;
  }
  if (lineSegments.length === 0) return;

  map.addSource("route-air-src", { type: "geojson", data });
  map.addLayer({
    id: "route-air-line",
    type: "line",
    source: "route-air-src",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#0891ff",
      "line-width": 4,
      "line-opacity": 0.9,
      "line-dasharray": [1.8, 1.8],
    },
  });
}

// ─── PlanMap (표시 전용: 마커는 제거 없이 스타일만 갱신) ───────────────────────

function PlanMap({
  plan,
  selectedSpotId,
  easeToRevision,
  onSpotSelectFromMap,
  routeCoordinates,
  routeLegs,
  routeLoading,
  routeKind,
}: {
  plan: TravelPlan;
  selectedSpotId: string | null;
  /** 목록에서 스팟을 눌렀을 때만 증가 → 지도만 부드럽게 이동 */
  easeToRevision: number;
  onSpotSelectFromMap: (id: string) => void;
  routeCoordinates: [number, number][] | null;
  routeLegs: V5PlanRouteLegSummary[] | null;
  routeLoading: boolean;
  routeKind: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersByIdRef = useRef(
    new Map<string, { marker: maplibregl.Marker; spot: TravelSpot; index: number }>(),
  );
  const onMapSelectRef = useRef(onSpotSelectFromMap);
  onMapSelectRef.current = onSpotSelectFromMap;

  const spotsWithCoords = useMemo(
    () =>
      plan.spots.filter(
        (s) =>
          s.lat != null &&
          s.lng != null &&
          Number.isFinite(s.lat) &&
          Number.isFinite(s.lng),
      ),
    [plan.spots],
  );

  const spotsFingerprint = useMemo(
    () => spotsWithCoords.map((s) => `${s.id}:${s.lat},${s.lng}`).join("|"),
    [spotsWithCoords],
  );

  const [mapReady, setMapReady] = useState(false);

  const syncMarkers = useCallback(
    (map: maplibregl.Map) => {
      const validIds = new Set(spotsWithCoords.map((s) => s.id));

      for (const [id, entry] of Array.from(markersByIdRef.current.entries())) {
        if (!validIds.has(id)) {
          entry.marker.remove();
          markersByIdRef.current.delete(id);
        }
      }

      spotsWithCoords.forEach((spot, idx) => {
        let entry = markersByIdRef.current.get(spot.id);
        if (!entry) {
          const root = document.createElement("div");
          root.style.pointerEvents = "auto";
          const pin = document.createElement("div");
          applyPinElement(pin, idx, spot.type, spot.id === selectedSpotId);
          root.appendChild(pin);
          root.addEventListener("mousedown", (e) => e.stopPropagation());
          root.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            onMapSelectRef.current(spot.id);
          });
          const marker = new maplibregl.Marker({ element: root, anchor: "center" })
            .setLngLat([spot.lng!, spot.lat!])
            .addTo(map);
          entry = { marker, spot, index: idx };
          markersByIdRef.current.set(spot.id, entry);
        } else {
          entry.spot = spot;
          entry.index = idx;
          entry.marker.setLngLat([spot.lng!, spot.lat!]);
          const root = entry.marker.getElement() as HTMLDivElement;
          const pin = root.firstElementChild as HTMLDivElement | null;
          if (pin) applyPinElement(pin, idx, spot.type, spot.id === selectedSpotId);
        }
      });
    },
    [spotsWithCoords, selectedSpotId],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const center: [number, number] =
      spotsWithCoords.length > 0
        ? [spotsWithCoords[0]!.lng!, spotsWithCoords[0]!.lat!]
        : [129.2134, 35.8326];

    const map = new maplibregl.Map({
      container,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center,
      zoom: 12,
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    const ro = new ResizeObserver(() => {
      map.resize();
    });
    ro.observe(container);

    map.on("load", () => {
      setMapReady(true);
      setRouteGeoJSON(map, []);
      if (spotsWithCoords.length >= 2) {
        const b = boundsFromLngLats(straightLineFromSpots(spotsWithCoords));
        if (b) map.fitBounds(b, { padding: 72, maxZoom: 14, duration: 0 });
      } else if (spotsWithCoords.length === 1) {
        map.jumpTo({
          center: [spotsWithCoords[0]!.lng!, spotsWithCoords[0]!.lat!],
          zoom: 13,
        });
      }
    });

    return () => {
      ro.disconnect();
      markersByIdRef.current.forEach((entry) => entry.marker.remove());
      markersByIdRef.current.clear();
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map?.isStyleLoaded()) return;
    const coords =
      routeCoordinates && routeCoordinates.length >= 2
        ? routeCoordinates
        : straightLineFromSpots(spotsWithCoords);
    if (coords.length >= 2) {
      setRouteGeoJSON(map, coords);
    } else {
      setRouteGeoJSON(map, []);
    }
  }, [mapReady, routeCoordinates, spotsWithCoords]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map?.isStyleLoaded()) return;
    const airLines: [number, number][][] = [];
    const legs = routeLegs ?? [];
    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i];
      if (leg?.mode !== "flight" && leg?.mode !== "ferry") continue;
      const a = spotsWithCoords[i];
      const b = spotsWithCoords[i + 1];
      if (!a?.lng || !a?.lat || !b?.lng || !b?.lat) continue;
      airLines.push([
        [a.lng, a.lat],
        [b.lng, b.lat],
      ]);
    }
    setAirRouteGeoJSON(map, airLines);
  }, [mapReady, routeLegs, spotsWithCoords]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map?.isStyleLoaded()) return;
    syncMarkers(map);
  }, [mapReady, spotsFingerprint, selectedSpotId, syncMarkers]);

  const prevEaseRef = useRef(0);
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map?.isStyleLoaded()) return;
    if (easeToRevision === prevEaseRef.current) return;
    prevEaseRef.current = easeToRevision;
    if (!selectedSpotId) return;
    const s = spotsWithCoords.find((x) => x.id === selectedSpotId);
    if (s) {
      map.easeTo({
        center: [s.lng!, s.lat!],
        zoom: Math.max(map.getZoom(), 13),
        duration: 380,
      });
    }
  }, [mapReady, easeToRevision, selectedSpotId, spotsWithCoords]);

  const prevRouteLoadingRef = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map?.isStyleLoaded()) return;
    const wasLoading = prevRouteLoadingRef.current;
    prevRouteLoadingRef.current = routeLoading;
    if (!wasLoading || routeLoading) return;
    const coords =
      routeCoordinates && routeCoordinates.length >= 2
        ? routeCoordinates
        : straightLineFromSpots(spotsWithCoords);
    if (coords.length < 2) return;
    const b = boundsFromLngLats(coords);
    if (b) map.fitBounds(b, { padding: 80, maxZoom: 14, duration: 520 });
  }, [mapReady, routeLoading, routeCoordinates, spotsWithCoords]);

  const routeHint = routeLoading
    ? "실제 도로·보행 네트워크로 경로를 계산하는 중…"
    : routeKind === "chained-air"
      ? "항공·페리 구간은 직선(점선)이며, 시간은 공항·선착장 대기를 포함한 추정이에요."
      : routeKind?.startsWith("full-")
        ? "도로를 따라 이은 경로예요."
        : routeKind?.startsWith("chained-")
          ? "구간별로 이어 붙인 경로예요."
          : routeKind === "rate-limit-fallback"
            ? "요청이 많아 직선으로만 표시했어요. 잠시 후 다시 열어 보세요."
            : routeKind === "straight-fallback"
              ? "경로 API를 쓰지 못해 직선으로 표시했어요."
              : spotsWithCoords.length < 2
                ? "좌표가 2곳 이상이면 동선을 그려요."
                : null;

  return (
    <div
      className="relative w-full h-full isolate [&_.maplibregl-ctrl]:m-2"
      style={{ transform: "translateZ(0)" }}
    >
      <div ref={containerRef} className="w-full h-full min-h-[200px]" />
      {routeHint && (
        <div
          className="absolute top-3 left-3 right-14 z-10 pointer-events-none rounded-xl px-3 py-2 text-[11px] font-medium text-[var(--text-secondary)] bg-[var(--bg-elevated)]/96 border border-[var(--border-default)] shadow-sm max-w-[min(100%,20rem)]"
          role="status"
        >
          {routeHint}
        </div>
      )}
    </div>
  );
}

// ─── Plan map modal: responsive layout + animated detail ───────────────────────

type PlanMapLayout = "phone" | "tabletPortrait" | "tabletLandscape" | "desktop";

function usePlanMapLayout(): PlanMapLayout {
  const [layout, setLayout] = useState<PlanMapLayout>("phone");
  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (w > 1368) {
        setLayout("desktop");
        return;
      }
      if (w >= 768) {
        setLayout(h >= w ? "tabletPortrait" : "tabletLandscape");
        return;
      }
      setLayout("phone");
    };
    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("orientationchange", compute);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("orientationchange", compute);
    };
  }, []);
  return layout;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

function SpotDetailPanelContent({
  plan,
  detailSpot,
  detailWiki,
  detailTour,
  isFs,
}: {
  plan: TravelPlan;
  detailSpot: TravelSpot;
  detailWiki: SpotWikiEnrichment | "err" | undefined;
  detailTour: SpotTourEnrichment | "err" | undefined;
  isFs: boolean;
}) {
  return (
    <>
      <div
        className={`relative w-full bg-[var(--bg-surface-subtle)] ${
          isFs ? "aspect-[16/9] md:aspect-[21/9] md:max-h-[min(40vh,320px)]" : "aspect-[16/10]"
        }`}
      >
        {(() => {
          const tourHero =
            detailTour && detailTour !== "err" && detailTour.imageUrl
              ? detailTour.imageUrl
              : null;
          const wikiHero =
            detailWiki && detailWiki !== "err" && detailWiki.thumbnail
              ? detailWiki.thumbnail
              : null;
          const fallbackHero =
            detailTour && detailTour !== "err" ? detailTour.displayImageUrl : null;
          const src = tourHero ?? wikiHero ?? fallbackHero;
          if (!src) {
            return (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
                <SpotTypeIcon type={detailSpot.type} size={40} />
              </div>
            );
          }
          return (
            <Image
              src={src}
              alt=""
              fill
              className="object-cover"
              sizes={isFs ? "(min-width:768px) 55vw, 100vw" : "380px"}
              unoptimized={src.includes("wikimedia") || tourImageUnoptimized(src)}
              priority
            />
          );
        })()}
      </div>

      <div className={`space-y-4 py-4 ${isFs ? "md:px-8 px-4" : "px-4"}`}>
        <div className="flex items-start gap-2 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface-subtle)]/60 px-3 py-3 md:px-4 md:py-3.5">
          <Star className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" fill="currentColor" />
          <div>
            <p className="text-[12px] font-semibold text-[var(--text-strong)]">별점·리뷰</p>
            <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">
              실시간 평점과 방문자 리뷰는 네이버·구글 지도에서 가장 정확해요. 아래에서 바로 열어 보세요.
            </p>
          </div>
        </div>

        {detailTour && detailTour !== "err" && detailTour.overview ? (
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              <Landmark className="h-3.5 w-3.5" />
              소개 · 한국관광공사 TourAPI
            </div>
            <p className="text-[13px] leading-relaxed text-[var(--text-secondary)] whitespace-pre-line">
              {detailTour.overview}
            </p>
          </div>
        ) : null}

        {detailWiki && detailWiki !== "err" ? (
          <>
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                <BookOpen className="h-3.5 w-3.5" />
                추가 참고 · 위키백과
              </div>
              <p className="text-[13px] leading-relaxed text-[var(--text-secondary)] whitespace-pre-line">
                {detailWiki.extract}
              </p>
            </div>
            <a
              href={detailWiki.articleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--border-default)] py-3 text-[13px] font-semibold text-[var(--brand-trust-blue)] transition-colors hover:bg-[var(--brand-trust-blue-soft)]"
            >
              위키백과에서 전문 읽기
              <ExternalLink className="h-4 w-4" />
            </a>
          </>
        ) : null}

        {(() => {
          const tourR = detailTour !== undefined;
          const wikiR = detailWiki !== undefined;
          const hasTourOv = Boolean(detailTour && detailTour !== "err" && detailTour.overview);
          const hasWikiEx = Boolean(detailWiki && detailWiki !== "err");
          const hasAny = hasTourOv || hasWikiEx;
          if (!tourR || !wikiR) {
            if (!hasAny) {
              return (
                <p className="text-[12px] text-[var(--text-muted)]">정보를 불러오는 중…</p>
              );
            }
            return null;
          }
          if (hasAny) return null;
          if (detailTour === "err" && detailWiki === "err") {
            return (
              <p className="text-[12px] leading-relaxed text-[var(--text-muted)]">
                TourAPI·위키 요약을 불러오지 못했어요. 지도 앱에서 상세 정보를 확인해 보세요.
              </p>
            );
          }
          return (
            <p className="text-[12px] leading-relaxed text-[var(--text-muted)]">
              공식 개요·위키 요약을 찾지 못했어요. 플랜 메모와 지도 링크를 참고해 주세요.
            </p>
          );
        })()}

        {detailSpot.note && (
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface-subtle)]/40 px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
              플랜 메모
            </p>
            <p className="text-[12px] leading-relaxed text-[var(--text-secondary)]">{detailSpot.note}</p>
          </div>
        )}

        <div className="flex flex-col gap-2 pb-2">
          <a
            href={`https://map.naver.com/p/search/${encodeURIComponent(detailSpot.name)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#03c75a] py-3 text-[13px] font-semibold text-white transition-opacity hover:opacity-95"
          >
            네이버 지도에서 보기
            <ExternalLink className="h-4 w-4" />
          </a>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${detailSpot.name} ${plan.region}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[var(--border-strong)] py-3 text-[13px] font-semibold text-[var(--text-strong)] transition-colors hover:bg-[var(--bg-surface-subtle)]"
          >
            구글 지도에서 보기
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </>
  );
}

function PlanSpotListBody({
  plan,
  listExpanded,
  setListExpanded,
  selectedSpotId,
  selectSpotFromList,
  openDetailSpot,
  spotTimes,
  planLegByFromIndex,
  wikiBySpotId,
  tourBySpotId,
  headerCollapseChevron = true,
}: {
  plan: TravelPlan;
  listExpanded: boolean;
  setListExpanded: (v: boolean | ((p: boolean) => boolean)) => void;
  selectedSpotId: string | null;
  selectSpotFromList: (id: string) => void;
  openDetailSpot: (id: string) => void;
  spotTimes: { arrive: string; depart: string }[];
  planLegByFromIndex: (V5PlanRouteLegSummary | undefined)[];
  wikiBySpotId: Record<string, SpotWikiEnrichment | "err" | undefined>;
  tourBySpotId: Record<string, SpotTourEnrichment | "err" | undefined>;
  /** false면 헤더에 접기 화살표 숨김(태블릿 가로 드로어 등) */
  headerCollapseChevron?: boolean;
}) {
  return (
    <>
      <button
        type="button"
        onClick={() => setListExpanded((v) => !v)}
        className={`flex flex-col items-stretch gap-0.5 px-4 pt-4 pb-2 text-left md:px-5 md:pt-5 md:pb-3 flex-shrink-0 ${headerCollapseChevron ? "md:cursor-default" : ""}`}
      >
        <span className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 min-w-0">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-surface-subtle)] text-[var(--brand-trust-blue)]">
              <MapIcon className="w-4 h-4" strokeWidth={2.25} />
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold text-[var(--text-strong)] tracking-tight">
                일정 스팟
              </span>
              <span className="block text-[12px] text-[var(--text-muted)] font-normal mt-0.5">
                {plan.spots.length}곳 · 탭하면 지도로 이동
              </span>
            </span>
          </span>
          {headerCollapseChevron && (
            <span className="md:hidden text-[var(--text-muted)] shrink-0">
              {listExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
            </span>
          )}
        </span>
      </button>

      {listExpanded && (
        <div className="overflow-y-auto flex-1 px-3 pb-5 md:px-4 space-y-3 md:space-y-3.5 scroll-smooth min-h-0">
          {plan.spots.map((spot, idx) => {
            const st = spotTimes[idx];
            const legAfter = planLegByFromIndex[idx];
            const wiki = wikiBySpotId[spot.id];
            const tour = tourBySpotId[spot.id];
            const tourImg =
              tour && tour !== "err" && tour.imageUrl && tour.imageUrl.length > 0
                ? tour.imageUrl
                : null;
            const wikiThumb = wiki && wiki !== "err" && wiki.thumbnail ? wiki.thumbnail : null;
            const thumb = tourImg ?? wikiThumb;
            const metaLoading = tour === undefined || wiki === undefined;
            return (
              <div key={spot.id}>
                <div
                  className={`rounded-[22px] transition-all duration-300 ease-out ${
                    selectedSpotId === spot.id
                      ? "border border-[var(--brand-trust-blue)]/20 bg-[var(--brand-trust-blue-soft)]/75 shadow-[0_10px_36px_rgba(47,79,143,0.11)] ring-1 ring-[var(--brand-trust-blue)]/12"
                      : "border border-transparent bg-[var(--bg-elevated)] shadow-[0_2px_14px_rgba(0,0,0,0.04)] hover:border-[var(--border-default)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.07)]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectSpotFromList(spot.id)}
                    className="w-full text-left flex gap-3.5 p-3.5 rounded-[22px] active:scale-[0.99] transition-transform duration-150"
                  >
                    <div className="relative h-[5.5rem] w-[5.5rem] shrink-0 overflow-hidden rounded-2xl bg-[var(--bg-surface-subtle)] ring-1 ring-black/[0.06] dark:ring-white/[0.08]">
                      {thumb ? (
                        <Image
                          src={thumb}
                          alt=""
                          width={168}
                          height={168}
                          className="h-full w-full object-cover"
                          sizes="84px"
                          unoptimized={
                            thumb.includes("wikimedia") || tourImageUnoptimized(thumb)
                          }
                        />
                      ) : metaLoading ? (
                        <div className="flex h-full w-full animate-pulse items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
                          <MapPin className="h-6 w-6 text-[var(--text-muted)]/40" />
                        </div>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
                          <SpotTypeIcon type={spot.type} size={22} />
                        </div>
                      )}
                      <span className="absolute bottom-1.5 right-1.5 flex h-6 min-w-[1.35rem] items-center justify-center rounded-full bg-[var(--text-strong)]/90 px-1.5 text-[10px] font-bold text-white shadow-sm backdrop-blur-[2px]">
                        {idx + 1}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
                      <p
                        className={`text-[15px] font-semibold leading-snug tracking-tight line-clamp-2 ${
                          selectedSpotId === spot.id
                            ? "text-[var(--brand-trust-blue)]"
                            : "text-[var(--text-strong)]"
                        }`}
                      >
                        {spot.name}
                      </p>
                      {st && (
                        <p className="text-[11px] font-medium tabular-nums tracking-wide text-[var(--brand-trust-blue)]">
                          {st.arrive} – {st.depart}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-muted)]">
                        <Clock className="w-3.5 h-3.5 opacity-70 shrink-0" strokeWidth={2} />
                        <span className="leading-snug">{spot.duration}</span>
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center justify-end gap-2 border-t border-[var(--border-default)]/50 px-3.5 py-2.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetailSpot(spot.id);
                      }}
                      className="inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-[12px] font-semibold text-[var(--brand-trust-blue)] transition-colors hover:bg-[var(--brand-trust-blue-soft)] active:opacity-90"
                    >
                      자세히 보기
                      <ChevronRight className="h-3.5 w-3.5 opacity-80" />
                    </button>
                  </div>
                </div>
                {idx < plan.spots.length - 1 &&
                  (spot.transitToNext ||
                    legAfter?.mode === "flight" ||
                    legAfter?.mode === "ferry") && (
                  <div className="flex items-start gap-2.5 py-2.5 pl-4 ml-2">
                    <div className="flex flex-col items-center pt-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--border-strong)]" />
                      <span className="w-px flex-1 min-h-[1.25rem] bg-gradient-to-b from-[var(--border-default)] to-transparent" />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-[12px] text-[var(--text-secondary)] leading-snug">
                        {spot.transitToNext ||
                          (legAfter?.mode === "flight"
                            ? "항공 이동 (공항 대기·비행·하기 포함 추정)"
                            : legAfter?.mode === "ferry"
                              ? "페리·여객선 이동 (선착장 대기 포함 추정)"
                              : "")}
                      </p>
                      {legAfter && (
                        <p className="text-[11px] text-[var(--brand-trust-blue)] font-medium mt-1 tabular-nums">
                          {legAfter.mode === "flight" || legAfter.mode === "ferry" ? (
                            <span className="mr-1.5 rounded bg-[var(--brand-trust-blue-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--brand-trust-blue)]">
                              {legAfter.mode === "flight" ? "항공" : "페리"}
                            </span>
                          ) : null}
                          약 {formatLegDuration(legAfter.durationSeconds)}
                          {legAfter.distanceMeters != null
                            ? ` · ${(legAfter.distanceMeters / 1000).toFixed(1)}km${
                                legAfter.mode === "flight" || legAfter.mode === "ferry"
                                  ? " 직선"
                                  : ""
                              }`
                            : ""}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div className="space-y-2 pt-2">
            {plan.weatherNote && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-[var(--bg-surface-subtle)]">
                <CloudSun className="w-3.5 h-3.5 text-[var(--warning)] flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  {plan.weatherNote}
                </p>
              </div>
            )}
            {plan.alternativeNote && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-[var(--warning-soft)]">
                <Sparkles className="w-3.5 h-3.5 text-[var(--warning)] flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  {plan.alternativeNote}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function SpotDetailHeader({
  title,
  isFs,
  onClose,
}: {
  title: string;
  isFs: boolean;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-[var(--border-default)]/80 px-4 py-3.5 md:px-5 bg-[var(--bg-elevated)] shrink-0">
      <p
        className={`min-w-0 font-semibold text-[var(--text-strong)] line-clamp-2 tracking-tight ${
          isFs ? "text-[15px] md:text-[16px]" : "text-[13px]"
        }`}
      >
        {title}
      </p>
      <button
        type="button"
        onClick={onClose}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] hover:bg-[var(--brand-primary-soft)] hover:text-[var(--text-strong)]"
        aria-label="닫기"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function V5PlanMapModal({
  plan,
  onClose,
}: {
  plan: TravelPlan;
  onClose: () => void;
}) {
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(
    plan.spots[0]?.id ?? null,
  );
  const [listExpanded, setListExpanded] = useState(true);
  const [easeToRevision, setEaseToRevision] = useState(0);
  const [departureTime, setDepartureTime] = useState("09:00");

  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][] | null>(null);
  const [routeLegs, setRouteLegs] = useState<V5PlanRouteLegSummary[] | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeKind, setRouteKind] = useState<string | null>(null);

  const [detailSpotId, setDetailSpotId] = useState<string | null>(null);
  const [wikiBySpotId, setWikiBySpotId] = useState<
    Record<string, SpotWikiEnrichment | "err" | undefined>
  >({});
  const [tourBySpotId, setTourBySpotId] = useState<
    Record<string, SpotTourEnrichment | "err" | undefined>
  >({});

  const shellRef = useRef<HTMLDivElement>(null);
  const [isFs, setIsFs] = useState(false);

  const planLayout = usePlanMapLayout();
  const reduceMotion = usePrefersReducedMotion();
  const [detailAnimOpen, setDetailAnimOpen] = useState(false);
  const [listDrawerOpen, setListDrawerOpen] = useState(true);
  const closeDetailTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tDur = reduceMotion ? "duration-100" : "duration-300";
  const tEase = reduceMotion ? "ease-linear" : "ease-[cubic-bezier(0.32,0.72,0,1)]";
  const stackedDetailSheet = planLayout === "phone" || planLayout === "tabletPortrait";

  const spotsWithCoords = useMemo(
    () =>
      plan.spots.filter(
        (s) =>
          s.lat != null &&
          s.lng != null &&
          Number.isFinite(s.lat) &&
          Number.isFinite(s.lng),
      ),
    [plan.spots],
  );

  const spotCoordsKey = useMemo(
    () =>
      spotsWithCoords
        .map(
          (s) =>
            `${s.id}:${s.lat},${s.lng}:${s.transitMode ?? ""}:${(s.transitToNext ?? "").slice(0, 48)}`,
        )
        .join("|"),
    [spotsWithCoords],
  );

  /** routeLegs[k] = spotsWithCoords[k]→[k+1], 플랜 원래 순서 idx에 맞춤 */
  const planLegByFromIndex = useMemo(() => {
    const n = plan.spots.length;
    const out: (V5PlanRouteLegSummary | undefined)[] = Array.from(
      { length: Math.max(0, n - 1) },
      () => undefined,
    );
    const legs = routeLegs;
    if (!legs?.length || spotsWithCoords.length < 2) return out;
    for (let k = 0; k < spotsWithCoords.length - 1; k++) {
      const a = spotsWithCoords[k]!;
      const b = spotsWithCoords[k + 1]!;
      const ia = plan.spots.findIndex((s) => s.id === a.id);
      if (ia >= 0 && plan.spots[ia + 1]?.id === b.id) {
        out[ia] = legs[k];
      }
    }
    return out;
  }, [plan.spots, spotsWithCoords, routeLegs]);

  const spotsWikiFetchKey = useMemo(
    () => plan.spots.map((s) => `${s.id}:${s.name}`).join("|"),
    [plan.spots],
  );

  useEffect(() => {
    const ac = new AbortController();
    plan.spots.forEach((spot) => {
      void (async () => {
        try {
          const url = `/api/v5/spot-enrichment?name=${encodeURIComponent(spot.name)}&region=${encodeURIComponent(plan.region)}`;
          const r = await fetch(url, { signal: ac.signal });
          const j = (await r.json()) as
            | ({ ok: true } & SpotWikiEnrichment)
            | { ok: false; error?: string };
          if (ac.signal.aborted) return;
          if (j.ok === true) {
            setWikiBySpotId((prev) => ({
              ...prev,
              [spot.id]: {
                title: j.title,
                displayTitle: j.displayTitle,
                extract: j.extract,
                thumbnail: j.thumbnail ?? null,
                articleUrl: j.articleUrl,
              },
            }));
          } else {
            setWikiBySpotId((prev) => ({ ...prev, [spot.id]: "err" }));
          }
        } catch {
          if (!ac.signal.aborted) setWikiBySpotId((prev) => ({ ...prev, [spot.id]: "err" }));
        }
      })();
    });
    return () => ac.abort();
  }, [plan.id, plan.region, spotsWikiFetchKey]);

  useEffect(() => {
    const ac = new AbortController();
    plan.spots.forEach((spot) => {
      void (async () => {
        const q = tourSearchQuery(spot, plan.region);
        try {
          const r = await fetch(`/api/tour/spot?q=${encodeURIComponent(q)}`, {
            signal: ac.signal,
          });
          const j = (await r.json()) as
            | {
                ok: true;
                contentId: string;
                contentTypeId: string;
                title: string;
                imageUrl: string | null;
                displayImageUrl: string;
                overview: string | null;
              }
            | { ok: false };
          if (ac.signal.aborted) return;
          if (j.ok === true) {
            setTourBySpotId((prev) => ({
              ...prev,
              [spot.id]: {
                contentId: j.contentId,
                contentTypeId: j.contentTypeId,
                title: j.title,
                imageUrl: j.imageUrl,
                displayImageUrl: j.displayImageUrl,
                overview: j.overview,
              },
            }));
          } else {
            setTourBySpotId((prev) => ({ ...prev, [spot.id]: "err" }));
          }
        } catch {
          if (!ac.signal.aborted) setTourBySpotId((prev) => ({ ...prev, [spot.id]: "err" }));
        }
      })();
    });
    return () => ac.abort();
  }, [plan.id, plan.region, spotsWikiFetchKey]);

  useEffect(() => {
    setSelectedSpotId((prev) =>
      prev != null && plan.spots.some((s) => s.id === prev)
        ? prev
        : plan.spots[0]?.id ?? null,
    );
  }, [plan.id, plan.spots]);

  useEffect(() => {
    let cancelled = false;
    if (spotsWithCoords.length < 2) {
      setRouteCoordinates(null);
      setRouteLegs(null);
      setRouteLoading(false);
      setRouteKind(null);
      return;
    }
    setRouteLoading(true);
    setRouteKind(null);
    const routeInputs = spotsWithCoords.map((s) => ({
      lat: s.lat!,
      lng: s.lng!,
      transitMode: s.transitMode,
      transitToNext: s.transitToNext,
    }));
    void fetchV5PlanRouteGeometry(routeInputs).then((res) => {
      if (cancelled) return;
      setRouteLoading(false);
      if (res.ok && res.coordinates.length >= 2) {
        setRouteCoordinates(res.coordinates);
        setRouteLegs(res.legs ?? []);
        setRouteKind(res.kind);
      } else {
        setRouteCoordinates(straightLineFromSpots(spotsWithCoords));
        setRouteLegs([]);
        setRouteKind(
          !res.ok && res.code === "RATE_LIMIT" ? "rate-limit-fallback" : "straight-fallback",
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [spotCoordsKey, spotsWithCoords]);

  const spotTimes = useMemo(() => {
    const startMin = parseTimeToMinutes(departureTime) ?? 9 * 60;
    const labels: { arrive: string; depart: string }[] = [];
    let t = startMin;
    for (let i = 0; i < plan.spots.length; i++) {
      const spot = plan.spots[i]!;
      const arriveMin = t;
      const stay = parseStayMinutes(spot.duration);
      const departMin = arriveMin + stay;
      labels.push({
        arrive: minutesToHHmm(arriveMin),
        depart: minutesToHHmm(departMin),
      });
      t = departMin;
      if (i < plan.spots.length - 1) {
        const leg = planLegByFromIndex[i];
        if (leg?.durationSeconds != null) {
          t += Math.max(1, Math.round(leg.durationSeconds / 60));
        } else {
          t += 20;
        }
      }
    }
    return labels;
  }, [plan.spots, departureTime, planLegByFromIndex]);

  const selectedSpot = plan.spots.find((s) => s.id === selectedSpotId) ?? null;
  const detailSpot = detailSpotId ? plan.spots.find((s) => s.id === detailSpotId) ?? null : null;
  const detailWiki = detailSpotId ? wikiBySpotId[detailSpotId] : undefined;
  const detailTour = detailSpotId ? tourBySpotId[detailSpotId] : undefined;

  useEffect(() => {
    const onFs = () => setIsFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const closeDetailSpot = useCallback(() => {
    setDetailAnimOpen(false);
    if (closeDetailTimerRef.current) clearTimeout(closeDetailTimerRef.current);
    const ms = reduceMotion ? 90 : 380;
    closeDetailTimerRef.current = setTimeout(() => {
      setDetailSpotId(null);
      closeDetailTimerRef.current = null;
    }, ms);
  }, [reduceMotion]);

  const openDetailSpot = useCallback(
    (id: string) => {
      if (closeDetailTimerRef.current) {
        clearTimeout(closeDetailTimerRef.current);
        closeDetailTimerRef.current = null;
      }
      setSelectedSpotId(id);
      setEaseToRevision((k) => k + 1);
      const wasEmpty = detailSpotId == null;
      setDetailSpotId(id);
      if (wasEmpty) {
        setDetailAnimOpen(false);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setDetailAnimOpen(true));
        });
      } else {
        setDetailAnimOpen(true);
      }
    },
    [detailSpotId],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (detailSpotId) {
        closeDetailSpot();
        return;
      }
      if (document.fullscreenElement) {
        void document.exitFullscreen();
        return;
      }
      onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, detailSpotId, closeDetailSpot]);

  const toggleFullscreen = useCallback(async () => {
    const el = shellRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      /* 일부 브라우저/iframe에서 실패 */
    }
  }, []);

  const selectSpotFromList = useCallback((id: string) => {
    setSelectedSpotId(id);
    setEaseToRevision((k) => k + 1);
  }, []);

  const listBodyProps = {
    plan,
    listExpanded,
    setListExpanded,
    selectedSpotId,
    selectSpotFromList,
    openDetailSpot,
    spotTimes,
    planLegByFromIndex,
    wikiBySpotId,
    tourBySpotId,
  };

  const renderMapArea = (mapWrapClass: string) => (
    <div className={mapWrapClass}>
      <PlanMap
        key={`${plan.id}-${spotCoordsKey}`}
        plan={plan}
        selectedSpotId={selectedSpotId}
        easeToRevision={easeToRevision}
        onSpotSelectFromMap={(id) => {
          setSelectedSpotId(id);
          setEaseToRevision((k) => k + 1);
        }}
        routeCoordinates={routeCoordinates}
        routeLegs={routeLegs}
        routeLoading={routeLoading}
        routeKind={routeKind}
      />
      {routeLoading && spotsWithCoords.length >= 2 && (
        <V5TravelAiAnalysisLoadingOverlay
          open
          variant="panel"
          phase="plan"
          className="absolute inset-0 z-[18] justify-start overflow-y-auto pt-6 md:pt-10"
        />
      )}
      {selectedSpot && (
        <div
          className="absolute bottom-3 left-3 right-3 md:right-auto md:max-w-[300px] px-4 py-3 rounded-2xl shadow-lg pointer-events-none z-[5]"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
          }}
        >
          <p className="text-[13px] font-bold text-[var(--text-strong)] truncate">
            {selectedSpot.name}
          </p>
          {selectedSpot.note && (
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed line-clamp-2">
              {selectedSpot.note}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Clock className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
            <span className="text-[11px] text-[var(--text-muted)]">{selectedSpot.duration}</span>
            {(() => {
              const idx = plan.spots.findIndex((s) => s.id === selectedSpot.id);
              if (idx < 0) return null;
              const st = spotTimes[idx];
              if (!st) return null;
              return (
                <span className="text-[11px] font-semibold text-[var(--brand-trust-blue)]">
                  {st.arrive} 도착 · {st.depart} 출발(예상)
                </span>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );

  const detailAsideWide =
    isFs && detailSpotId
      ? "md:flex-1 md:min-w-0 md:max-w-none md:w-auto min-w-[min(100%,380px)] w-[min(100%,380px)]"
      : "min-w-[min(100%,380px)] w-[min(100%,380px)] max-w-[min(100%,380px)]";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      style={{ background: "rgba(10,10,10,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={shellRef}
        className={`relative w-full md:mx-auto flex flex-col bg-[var(--bg-elevated)] overflow-hidden ${
          isFs
            ? "h-screen max-h-none rounded-none md:max-w-none"
            : detailSpotId
              ? "h-[92dvh] md:h-[85vh] rounded-t-3xl md:rounded-3xl md:max-w-[min(98vw,1180px)]"
              : "h-[92dvh] md:h-[85vh] rounded-t-3xl md:rounded-3xl md:max-w-[920px]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0 border-b border-[var(--border-default)] gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <MapPin className="w-3.5 h-3.5 text-[var(--brand-trust-blue)] shrink-0" />
              <span className="text-[10px] font-bold text-[var(--brand-trust-blue)] uppercase tracking-widest">
                나의 플랜
              </span>
            </div>
            <p className="text-[16px] font-bold text-[var(--text-strong)] truncate">{plan.title}</p>
            <p className="text-[12px] text-[var(--text-muted)]">
              {plan.region} · {plan.days}박 {plan.days + 1}일
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-strong)] hover:bg-[var(--brand-primary-soft)] transition-all"
              title={isFs ? "전체 화면 종료" : "전체 화면"}
              aria-label={isFs ? "전체 화면 종료" : "전체 화면"}
            >
              {isFs ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-strong)] hover:bg-[var(--brand-primary-soft)] transition-all"
              aria-label="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-5 py-2.5 flex flex-wrap items-center gap-3 border-b border-[var(--border-default)] bg-[var(--bg-surface-subtle)]/40">
          <label className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
            <Clock className="w-3.5 h-3.5 text-[var(--brand-trust-blue)] shrink-0" />
            <span className="font-medium text-[var(--text-strong)] whitespace-nowrap">첫 스팟 출발</span>
            <input
              type="time"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 py-1 text-[13px] font-mono text-[var(--text-strong)]"
            />
          </label>
          <p className="text-[11px] text-[var(--text-muted)] leading-snug max-w-md">
            이동 구간은 도로 경로 API 기준 예상 시간이며, 체류 시간은 스팟 설명에서 추정합니다. 실제 일정과 다를 수 있어요.
          </p>
        </div>

        {planLayout === "tabletLandscape" ? (
          <div className="flex-1 relative min-h-0 min-w-0">
            <div
              className={`absolute left-0 top-0 bottom-0 z-[25] flex w-[min(100%,392px)] flex-col bg-[var(--bg-elevated)] border-r border-[var(--border-default)] rounded-none shadow-none transition-transform will-change-transform ${tDur} ${tEase} ${
                listDrawerOpen ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <div className="flex items-center justify-between gap-2 border-b border-[var(--border-default)] px-3 py-2.5 shrink-0 bg-[var(--bg-surface-subtle)]/50">
                  <span className="text-[13px] font-semibold text-[var(--text-strong)]">일정 스팟</span>
                  <button
                    type="button"
                    aria-label="일정 패널 접기"
                    onClick={() => setListDrawerOpen(false)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] ring-1 ring-[var(--border-default)] hover:bg-[var(--brand-primary-soft)] hover:text-[var(--text-strong)] transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </div>
                <div className="min-h-0 flex-1 flex flex-col overflow-hidden">
                  <PlanSpotListBody {...listBodyProps} headerCollapseChevron={false} />
                </div>
              </div>
            </div>
            {!listDrawerOpen && (
              <button
                type="button"
                aria-label="일정 스팟 패널 열기"
                onClick={() => setListDrawerOpen(true)}
                className="absolute left-0 top-1/2 z-[24] -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-r-2xl rounded-l-none border border-l-0 border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--brand-trust-blue)] shadow-md hover:bg-[var(--brand-trust-blue-soft)] transition-transform active:scale-95"
              >
                <MapIcon className="w-5 h-5" strokeWidth={2.25} />
              </button>
            )}
            {renderMapArea("absolute inset-0 min-h-0")}
            {detailSpotId && detailSpot && (
              <>
                <button
                  type="button"
                  aria-label="상세 닫기"
                  onClick={closeDetailSpot}
                  className={`absolute inset-0 z-[54] bg-black/30 backdrop-blur-[1px] transition-opacity ${tDur} ${
                    detailAnimOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                  }`}
                />
                <aside
                  className={`absolute right-0 top-0 bottom-0 z-[56] flex w-[min(100%,400px)] flex-col rounded-none border-l border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-none transition-transform will-change-transform ${tDur} ${tEase} ${
                    detailAnimOpen ? "translate-x-0" : "translate-x-full"
                  }`}
                >
                  <SpotDetailHeader title={detailSpot.name} isFs={isFs} onClose={closeDetailSpot} />
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                    <SpotDetailPanelContent
                      plan={plan}
                      detailSpot={detailSpot}
                      detailWiki={detailWiki}
                      detailTour={detailTour}
                      isFs={isFs}
                    />
                  </div>
                </aside>
              </>
            )}
          </div>
        ) : (
          <div
            className={`flex-1 flex min-h-0 ${
              planLayout === "desktop"
                ? "flex-row"
                : planLayout === "tabletPortrait"
                  ? "relative flex-col"
                  : "flex-col"
            }`}
          >
            {renderMapArea(
              planLayout === "tabletPortrait"
                ? "relative flex-1 min-h-0 min-w-0 min-h-[36dvh]"
                : "relative flex-1 min-h-0 min-w-0 min-h-[42dvh] md:min-h-0",
            )}
            <div
              className={
                planLayout === "tabletPortrait"
                  ? "absolute bottom-0 left-0 right-0 z-[14] flex w-full max-h-[min(52vh,560px)] min-h-0 flex-col overflow-hidden rounded-none border-t border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-none"
                  : planLayout === "desktop"
                    ? `relative flex flex-shrink-0 flex-col border-t border-[var(--border-default)] md:flex-row md:border-t-0 md:border-l md:min-h-0 min-h-0 overflow-visible md:overflow-hidden max-h-[48vh] md:max-h-none ${
                        isFs && detailSpotId
                          ? "md:flex-1 md:min-w-0 md:max-w-none"
                          : detailSpotId
                            ? "md:w-auto md:max-w-[min(100%,820px)] md:shrink-0"
                            : "md:w-[min(100%,392px)] md:shrink-0"
                      }`
                    : "relative flex flex-shrink-0 flex-col border-t border-[var(--border-default)] max-h-[48vh] min-h-0 overflow-visible"
              }
            >
              <div
                className={
                  planLayout === "desktop"
                    ? `flex min-h-0 min-w-0 flex-col md:border-r md:border-[var(--border-default)]/60 ${
                        isFs && detailSpotId
                          ? "md:w-[min(100%,380px)] md:max-w-[380px] md:shrink-0"
                          : "md:w-[min(100%,392px)] md:max-w-[392px] md:shrink-0"
                      }`
                    : "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
                }
              >
                <PlanSpotListBody {...listBodyProps} />
              </div>

              {planLayout === "desktop" && detailSpotId && detailSpot && (
                <aside
                  className={`flex min-h-0 flex-shrink-0 flex-col overflow-hidden bg-[var(--bg-elevated)] transition-[min-width,width,max-width,opacity,transform,border-color] will-change-[width,opacity,transform] ${tDur} ${tEase} md:border-l border-[var(--border-default)] md:border-t-0 border-t ${
                    detailAnimOpen
                      ? `${detailAsideWide} translate-x-0 opacity-100`
                      : "min-w-0 w-0 max-w-0 translate-x-3 border-transparent opacity-0 pointer-events-none"
                  } ${isFs && detailSpotId ? "md:flex-1" : ""}`}
                >
                  <SpotDetailHeader title={detailSpot.name} isFs={isFs} onClose={closeDetailSpot} />
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                    <SpotDetailPanelContent
                      plan={plan}
                      detailSpot={detailSpot}
                      detailWiki={detailWiki}
                      detailTour={detailTour}
                      isFs={isFs}
                    />
                  </div>
                </aside>
              )}
            </div>
          </div>
        )}

        {stackedDetailSheet && detailSpotId && detailSpot && (
          <>
            <button
              type="button"
              aria-label="상세 닫기"
              onClick={closeDetailSpot}
              className={`absolute inset-0 z-[62] bg-black/40 backdrop-blur-[2px] transition-opacity ${tDur} ${
                detailAnimOpen ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            />
            <div
              className={`absolute left-0 right-0 bottom-0 z-[64] flex w-full max-h-[min(92dvh,720px)] flex-col rounded-none border-t border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-none transition-transform will-change-transform ${tDur} ${tEase} ${
                detailAnimOpen ? "translate-y-0" : "translate-y-full"
              }`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="v5-spot-detail-sheet-title"
            >
              <div className="mx-auto mt-2 h-1 w-11 shrink-0 rounded-full bg-[var(--border-strong)]/70 md:hidden" aria-hidden />
              <div id="v5-spot-detail-sheet-title" className="sr-only">
                {detailSpot.name} 상세 정보
              </div>
              <SpotDetailHeader title={detailSpot.name} isFs={isFs} onClose={closeDetailSpot} />
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom,0px)]">
                <SpotDetailPanelContent
                  plan={plan}
                  detailSpot={detailSpot}
                  detailWiki={detailWiki}
                  detailTour={detailTour}
                  isFs={isFs}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
