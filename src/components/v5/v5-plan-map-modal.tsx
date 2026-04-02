"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { fetchV5PlanRouteGeometry } from "@/lib/v5/fetch-v5-plan-route.server";
import type { V5PlanRouteLegSummary } from "@/lib/v5/fetch-v5-plan-route.server";
import "maplibre-gl/dist/maplibre-gl.css";
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
  Navigation,
  Maximize2,
  Minimize2,
  Map as MapIcon,
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

function applyPinElement(
  el: HTMLDivElement,
  index: number,
  type: SpotType,
  selected: boolean,
) {
  const color = selected ? "#1c1c1e" : SPOT_COLORS[type].hex;
  el.style.cssText = `
    width: 32px; height: 32px;
    background: ${selected ? "#1c1c1e" : "#fff"};
    border: 2.5px solid ${color};
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700;
    color: ${selected ? "#fff" : color};
    box-shadow: 0 2px 8px rgba(0,0,0,0.18);
    cursor: pointer;
    pointer-events: auto;
    user-select: none;
    transform: scale(1);
    transform-origin: center center;
  `;
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
          const el = document.createElement("div");
          applyPinElement(el, idx, spot.type, spot.id === selectedSpotId);
          el.addEventListener("mousedown", (e) => e.stopPropagation());
          el.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            onMapSelectRef.current(spot.id);
          });
          const marker = new maplibregl.Marker({ element: el, anchor: "center" })
            .setLngLat([spot.lng!, spot.lat!])
            .addTo(map);
          entry = { marker, spot, index: idx };
          markersByIdRef.current.set(spot.id, entry);
        } else {
          entry.spot = spot;
          entry.index = idx;
          entry.marker.setLngLat([spot.lng!, spot.lat!]);
          const el = entry.marker.getElement() as HTMLDivElement;
          applyPinElement(el, idx, spot.type, spot.id === selectedSpotId);
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

  useEffect(() => {
    const onFs = () => setIsFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (document.fullscreenElement) {
        void document.exitFullscreen();
        return;
      }
      onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

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
        className={`relative w-full md:max-w-[860px] md:mx-auto flex flex-col bg-[var(--bg-elevated)] overflow-hidden ${
          isFs ? "h-screen max-h-none rounded-none" : "h-[92dvh] md:h-[85vh] rounded-t-3xl md:rounded-3xl"
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
          <div className="flex-1 min-h-0 relative min-h-[42dvh] md:min-h-0">
            <PlanMap
              key={`${plan.id}-${spotCoordsKey}`}
              plan={plan}
              selectedSpotId={selectedSpotId}
              easeToRevision={easeToRevision}
              onSpotSelectFromMap={setSelectedSpotId}
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

          <div className="md:w-[300px] flex-shrink-0 border-t md:border-t-0 md:border-l border-[var(--border-default)] flex flex-col max-h-[38vh] md:max-h-none overflow-hidden">
            <button
              type="button"
              onClick={() => setListExpanded((v) => !v)}
              className="flex items-center justify-between px-4 py-3 flex-shrink-0 md:cursor-default"
            >
              <span className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                <MapIcon className="w-3.5 h-3.5" />
                스팟 목록 ({plan.spots.length})
              </span>
              <span className="md:hidden text-[var(--text-muted)]">
                {listExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </span>
            </button>

            {listExpanded && (
              <div className="overflow-y-auto flex-1 px-3 pb-4 space-y-1">
                {plan.spots.map((spot, idx) => {
                  const st = spotTimes[idx];
                  const legAfter = routeLegs?.[idx];
                  return (
                    <div key={spot.id}>
                      <button
                        type="button"
                        onClick={() => selectSpotFromList(spot.id)}
                        className={`w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
                          selectedSpotId === spot.id
                            ? "bg-[var(--brand-trust-blue-soft)] border border-[var(--brand-trust-blue)]/20"
                            : "hover:bg-[var(--bg-surface-subtle)]"
                        }`}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          <div
                            className={`relative w-8 h-8 rounded-full flex items-center justify-center ${SPOT_COLORS[spot.type].bg} ${SPOT_COLORS[spot.type].text}`}
                          >
                            <SpotTypeIcon type={spot.type} size={14} />
                            <span className="absolute -bottom-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-0.5 rounded-full bg-[var(--text-strong)] text-white text-[9px] font-bold flex items-center justify-center border-2 border-[var(--bg-elevated)] shadow-sm">
                              {idx + 1}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-[13px] font-semibold truncate ${
                              selectedSpotId === spot.id
                                ? "text-[var(--brand-trust-blue)]"
                                : "text-[var(--text-strong)]"
                            }`}
                          >
                            {spot.name}
                          </p>
                          {st && (
                            <p className="text-[10px] font-mono text-[var(--brand-trust-blue)] mt-0.5">
                              {st.arrive} 도착 → {st.depart} 출발
                            </p>
                          )}
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock className="w-2.5 h-2.5 text-[var(--text-muted)]" />
                            <span className="text-[11px] text-[var(--text-muted)]">{spot.duration}</span>
                          </div>
                        </div>
                      </button>
                      {spot.transitToNext && idx < plan.spots.length - 1 && (
                        <div className="flex items-start gap-1.5 pl-4 py-1 ml-2 border-l-2 border-[var(--border-strong)]/60">
                          <Navigation className="w-3 h-3 text-[var(--text-muted)] shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-[11px] text-[var(--text-muted)]">{spot.transitToNext}</p>
                            {legAfter && (
                              <p className="text-[10px] text-[var(--brand-trust-blue)] font-medium mt-0.5">
                                경로 예상 {formatLegDuration(legAfter.durationSeconds)}
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
        </div>
      </div>
    </div>
  );
}
