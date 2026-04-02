"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { fetchV5PlanRouteGeometry } from "@/lib/v5/fetch-v5-plan-route.server";
import type { V5PlanRouteLegSummary } from "@/lib/v5/fetch-v5-plan-route.server";
import "maplibre-gl/dist/maplibre-gl.css";
import Image from "next/image";
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
  Maximize2,
  Minimize2,
  Map as MapIcon,
  ExternalLink,
  Star,
  ChevronRight,
  BookOpen,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type SpotType = "attraction" | "food" | "cafe" | "transport" | "hotel";

interface TravelSpot {
  id: string;
  name: string;
  type: SpotType;
  duration: string;
  note?: string;
  transitToNext?: string;
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

// ─── PlanMap (표시 전용: 마커는 제거 없이 스타일만 갱신) ───────────────────────

function PlanMap({
  plan,
  selectedSpotId,
  easeToRevision,
  onSpotSelectFromMap,
  routeCoordinates,
  routeLoading,
  routeKind,
}: {
  plan: TravelPlan;
  selectedSpotId: string | null;
  /** 목록에서 스팟을 눌렀을 때만 증가 → 지도만 부드럽게 이동 */
  easeToRevision: number;
  onSpotSelectFromMap: (id: string) => void;
  routeCoordinates: [number, number][] | null;
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

  const shellRef = useRef<HTMLDivElement>(null);
  const [isFs, setIsFs] = useState(false);

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
    () => spotsWithCoords.map((s) => `${s.id}:${s.lat},${s.lng}`).join("|"),
    [spotsWithCoords],
  );

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
    const pts = spotsWithCoords.map((s) => ({ lat: s.lat!, lng: s.lng! }));
    void fetchV5PlanRouteGeometry(pts).then((res) => {
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
    const legs = routeLegs ?? [];
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
        const leg = legs[i];
        if (leg?.durationSeconds != null) {
          t += Math.max(1, Math.round(leg.durationSeconds / 60));
        } else {
          t += 20;
        }
      }
    }
    return labels;
  }, [plan.spots, departureTime, routeLegs]);

  const selectedSpot = plan.spots.find((s) => s.id === selectedSpotId) ?? null;
  const detailSpot = detailSpotId ? plan.spots.find((s) => s.id === detailSpotId) ?? null : null;
  const detailWiki = detailSpotId ? wikiBySpotId[detailSpotId] : undefined;

  useEffect(() => {
    const onFs = () => setIsFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (detailSpotId) {
        setDetailSpotId(null);
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
  }, [onClose, detailSpotId]);

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

        <div className="flex-1 flex flex-col md:flex-row min-h-0">
          <div className="flex-1 min-h-0 min-w-0 relative min-h-[42dvh] md:min-h-0">
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
              routeLoading={routeLoading}
              routeKind={routeKind}
            />
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

          <div
            className={`relative flex flex-shrink-0 flex-col border-t border-[var(--border-default)] md:flex-row md:border-t-0 md:border-l max-h-[48vh] md:max-h-none md:min-h-0 min-h-0 overflow-visible md:overflow-hidden ${
              isFs && detailSpotId
                ? "md:flex-1 md:min-w-0 md:max-w-none"
                : detailSpotId
                  ? "md:w-auto md:max-w-[min(100%,820px)] md:shrink-0"
                  : "md:w-[min(100%,392px)] md:shrink-0"
            }`}
          >
            <div
              className={`flex min-h-0 min-w-0 flex-col border-[var(--border-default)]/0 md:border-r md:border-[var(--border-default)]/60 ${
                isFs && detailSpotId
                  ? "md:w-[min(100%,380px)] md:max-w-[380px] md:shrink-0"
                  : "md:w-[min(100%,392px)] md:max-w-[392px] md:shrink-0"
              }`}
            >
            <button
              type="button"
              onClick={() => setListExpanded((v) => !v)}
              className="flex flex-col items-stretch gap-0.5 px-4 pt-4 pb-2 text-left md:px-5 md:pt-5 md:pb-3 flex-shrink-0 md:cursor-default"
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
                <span className="md:hidden text-[var(--text-muted)] shrink-0">
                  {listExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                </span>
              </span>
            </button>

            {listExpanded && (
              <div className="overflow-y-auto flex-1 px-3 pb-5 md:px-4 space-y-3 md:space-y-3.5 scroll-smooth">
                {plan.spots.map((spot, idx) => {
                  const st = spotTimes[idx];
                  const legAfter = routeLegs?.[idx];
                  const wiki = wikiBySpotId[spot.id];
                  const thumb =
                    wiki && wiki !== "err" && wiki.thumbnail ? wiki.thumbnail : null;
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
                                unoptimized={thumb.includes("wikimedia")}
                              />
                            ) : wiki === undefined ? (
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
                              setDetailSpotId(spot.id);
                              setSelectedSpotId(spot.id);
                              setEaseToRevision((k) => k + 1);
                            }}
                            className="inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-[12px] font-semibold text-[var(--brand-trust-blue)] transition-colors hover:bg-[var(--brand-trust-blue-soft)] active:opacity-90"
                          >
                            자세히 보기
                            <ChevronRight className="h-3.5 w-3.5 opacity-80" />
                          </button>
                        </div>
                      </div>
                      {spot.transitToNext && idx < plan.spots.length - 1 && (
                        <div className="flex items-start gap-2.5 py-2.5 pl-4 ml-2">
                          <div className="flex flex-col items-center pt-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--border-strong)]" />
                            <span className="w-px flex-1 min-h-[1.25rem] bg-gradient-to-b from-[var(--border-default)] to-transparent" />
                          </div>
                          <div className="min-w-0 pt-0.5">
                            <p className="text-[12px] text-[var(--text-secondary)] leading-snug">{spot.transitToNext}</p>
                            {legAfter && (
                              <p className="text-[11px] text-[var(--brand-trust-blue)] font-medium mt-1 tabular-nums">
                                약 {formatLegDuration(legAfter.durationSeconds)}
                                {legAfter.distanceMeters != null
                                  ? ` · ${(legAfter.distanceMeters / 1000).toFixed(1)}km`
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
                      <CloudSun className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                        {plan.weatherNote}
                      </p>
                    </div>
                  )}
                  {plan.alternativeNote && (
                    <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-50">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-700 leading-relaxed">{plan.alternativeNote}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            </div>

            {detailSpotId && detailSpot && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-[55] bg-black/35 backdrop-blur-[1px] md:hidden"
                  aria-label="상세 닫기"
                  onClick={() => setDetailSpotId(null)}
                />
                <aside
                  className={`fixed inset-y-0 right-0 z-[60] flex w-[min(100%,420px)] flex-col border-l border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-[-12px_0_40px_rgba(0,0,0,0.14)] md:static md:z-0 md:flex md:h-full md:min-h-0 md:shadow-none ${
                    isFs && detailSpotId
                      ? "md:flex-1 md:min-w-0 md:max-w-none md:w-auto"
                      : "md:w-[min(100%,380px)] md:max-w-[380px] md:shrink-0"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-[var(--border-default)]/80 px-4 py-3.5 md:px-5 bg-[var(--bg-elevated)]">
                    <p
                      className={`min-w-0 font-semibold text-[var(--text-strong)] line-clamp-2 tracking-tight ${
                        isFs ? "text-[15px] md:text-[16px]" : "text-[13px]"
                      }`}
                    >
                      {detailSpot.name}
                    </p>
                    <button
                      type="button"
                      onClick={() => setDetailSpotId(null)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] hover:bg-[var(--brand-primary-soft)] hover:text-[var(--text-strong)]"
                      aria-label="닫기"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <div
                      className={`relative w-full bg-[var(--bg-surface-subtle)] ${
                        isFs ? "aspect-[16/9] md:aspect-[21/9] md:max-h-[min(40vh,320px)]" : "aspect-[16/10]"
                      }`}
                    >
                      {detailWiki && detailWiki !== "err" && detailWiki.thumbnail ? (
                        <Image
                          src={detailWiki.thumbnail}
                          alt=""
                          fill
                          className="object-cover"
                          sizes={isFs ? "(min-width:768px) 55vw, 100vw" : "380px"}
                          unoptimized={detailWiki.thumbnail.includes("wikimedia")}
                          priority
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
                          <SpotTypeIcon type={detailSpot.type} size={40} />
                        </div>
                      )}
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

                      {detailWiki && detailWiki !== "err" ? (
                        <>
                          <div>
                            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                              <BookOpen className="h-3.5 w-3.5" />
                              소개 · 위키백과
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
                      ) : detailWiki === "err" ? (
                        <p className="text-[12px] leading-relaxed text-[var(--text-muted)]">
                          이 장소에 대한 백과 요약을 불러오지 못했어요. 지도 앱에서 상세 정보를 확인해 보세요.
                        </p>
                      ) : (
                        <p className="text-[12px] text-[var(--text-muted)]">정보를 불러오는 중…</p>
                      )}

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
                  </div>
                </aside>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
