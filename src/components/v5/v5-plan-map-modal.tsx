"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
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
} from "lucide-react";

// ─── Types (re-declared locally to avoid cross-file coupling) ─────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function createPinElement(index: number, type: SpotType, selected: boolean) {
  const el = document.createElement("div");
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
    transition: transform 0.15s ease;
    user-select: none;
  `;
  el.textContent = String(index + 1);
  el.onmouseenter = () => { el.style.transform = "scale(1.1)"; };
  el.onmouseleave = () => { el.style.transform = "scale(1)"; };
  return el;
}

// ─── Map Component ────────────────────────────────────────────────────────────

function PlanMap({
  plan,
  selectedSpotId,
  onSpotSelect,
}: {
  plan: TravelPlan;
  selectedSpotId: string | null;
  onSpotSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const spotsWithCoords = plan.spots.filter((s) => s.lat != null && s.lng != null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const center: [number, number] =
      spotsWithCoords.length > 0
        ? [spotsWithCoords[0].lng!, spotsWithCoords[0].lat!]
        : [129.2134, 35.8326]; // Gyeongju fallback

    const map = new maplibregl.Map({
      container,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center,
      zoom: 12,
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(container);

    map.on("load", () => {
      // Route line
      if (spotsWithCoords.length >= 2) {
        const coords: [number, number][] = spotsWithCoords.map((s) => [s.lng!, s.lat!]);
        map.addSource("route-src", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: coords },
          },
        });
        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route-src",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#2f4f8f",
            "line-width": 3,
            "line-dasharray": [2, 1.5],
            "line-opacity": 0.7,
          },
        });
      }

      // Markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      spotsWithCoords.forEach((spot, idx) => {
        const el = createPinElement(idx, spot.type, spot.id === selectedSpotId);
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onSpotSelect(spot.id);
        });
        const marker = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat([spot.lng!, spot.lat!])
          .addTo(map);
        markersRef.current.push(marker);
      });

      // Fit bounds
      if (spotsWithCoords.length >= 2) {
        const lngs = spotsWithCoords.map((s) => s.lng!);
        const lats = spotsWithCoords.map((s) => s.lat!);
        map.fitBounds(
          [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
          { padding: 60, maxZoom: 15, duration: 0 }
        );
      }
    });

    return () => {
      ro.disconnect();
      markersRef.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker styles when selection changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    spotsWithCoords.forEach((spot, idx) => {
      const el = createPinElement(idx, spot.type, spot.id === selectedSpotId);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSpotSelect(spot.id);
      });
      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([spot.lng!, spot.lat!])
        .addTo(map);
      markersRef.current.push(marker);
    });
    // Pan to selected
    if (selectedSpotId) {
      const s = spotsWithCoords.find((x) => x.id === selectedSpotId);
      if (s) map.easeTo({ center: [s.lng!, s.lat!], duration: 300 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSpotId]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full [&_.maplibregl-ctrl]:m-2"
    />
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
    plan.spots[0]?.id ?? null
  );
  const [listExpanded, setListExpanded] = useState(true);

  const selectedSpot = plan.spots.find((s) => s.id === selectedSpotId) ?? null;

  // Close on Esc
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      style={{ background: "rgba(10,10,10,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full md:max-w-[860px] md:mx-auto h-[92dvh] md:h-[85vh] rounded-t-3xl md:rounded-3xl overflow-hidden flex flex-col"
        style={{ background: "var(--bg-elevated)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0 border-b border-[var(--border-default)]">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <MapPin className="w-3.5 h-3.5 text-[var(--brand-trust-blue)]" />
              <span className="text-[10px] font-bold text-[var(--brand-trust-blue)] uppercase tracking-widest">
                나의 플랜
              </span>
            </div>
            <p className="text-[16px] font-bold text-[var(--text-strong)]">{plan.title}</p>
            <p className="text-[12px] text-[var(--text-muted)]">{plan.region} · {plan.days}박 {plan.days + 1}일</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-strong)] hover:bg-[var(--brand-primary-soft)] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body: Map + Spot List */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0">
          {/* Map */}
          <div className="flex-1 min-h-0 relative">
            <PlanMap
              plan={plan}
              selectedSpotId={selectedSpotId}
              onSpotSelect={setSelectedSpotId}
            />
            {/* Selected spot tooltip on map */}
            {selectedSpot && (
              <div className="absolute bottom-3 left-3 right-3 md:right-auto md:max-w-[280px] px-4 py-3 rounded-2xl shadow-lg pointer-events-none"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
              >
                <p className="text-[13px] font-bold text-[var(--text-strong)] truncate">{selectedSpot.name}</p>
                {selectedSpot.note && (
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed line-clamp-2">{selectedSpot.note}</p>
                )}
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3 text-[var(--text-muted)]" />
                  <span className="text-[11px] text-[var(--text-muted)]">{selectedSpot.duration}</span>
                </div>
              </div>
            )}
          </div>

          {/* Spot List Panel */}
          <div className="md:w-[280px] flex-shrink-0 border-t md:border-t-0 md:border-l border-[var(--border-default)] flex flex-col max-h-[40vh] md:max-h-none overflow-hidden">
            {/* List header (collapsible on mobile) */}
            <button
              onClick={() => setListExpanded((v) => !v)}
              className="flex items-center justify-between px-4 py-3 flex-shrink-0 md:cursor-default"
            >
              <span className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                스팟 목록 ({plan.spots.length})
              </span>
              <span className="md:hidden text-[var(--text-muted)]">
                {listExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </span>
            </button>

            {(listExpanded) && (
              <div className="overflow-y-auto flex-1 px-3 pb-4 space-y-1">
                {plan.spots.map((spot, idx) => (
                  <div key={spot.id}>
                    <button
                      onClick={() => setSelectedSpotId(spot.id)}
                      className={`w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
                        selectedSpotId === spot.id
                          ? "bg-[var(--brand-trust-blue-soft)] border border-[var(--brand-trust-blue)]/20"
                          : "hover:bg-[var(--bg-surface-subtle)]"
                      }`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center relative ${SPOT_COLORS[spot.type].bg} ${SPOT_COLORS[spot.type].text}`}>
                          <SpotTypeIcon type={spot.type} size={12} />
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[var(--text-strong)] text-white text-[9px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] font-semibold truncate ${selectedSpotId === spot.id ? "text-[var(--brand-trust-blue)]" : "text-[var(--text-strong)]"}`}>
                          {spot.name}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock className="w-2.5 h-2.5 text-[var(--text-muted)]" />
                          <span className="text-[11px] text-[var(--text-muted)]">{spot.duration}</span>
                        </div>
                      </div>
                    </button>
                    {spot.transitToNext && idx < plan.spots.length - 1 && (
                      <div className="flex items-center gap-1.5 pl-5 py-1 ml-1">
                        <div className="w-0.5 h-3 bg-[var(--border-strong)]" />
                        <Navigation className="w-2.5 h-2.5 text-[var(--text-muted)]" />
                        <span className="text-[11px] text-[var(--text-muted)]">{spot.transitToNext}</span>
                      </div>
                    )}
                  </div>
                ))}

                {/* Footer notes */}
                <div className="space-y-2 pt-2">
                  {plan.weatherNote && (
                    <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-[var(--bg-surface-subtle)]">
                      <CloudSun className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{plan.weatherNote}</p>
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
