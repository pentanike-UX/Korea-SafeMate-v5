"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { getNaverMapsNcpClientId } from "@/lib/maps/map-display-mode";
import { loadNaverMapsScript } from "@/lib/maps/naver-maps-script";
import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NMaps = any;

export function SpotPinMapNaver({
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
  const mapRef = useRef<NMaps | null>(null);
  const [mapErr, setMapErr] = useState<string | null>(null);

  const clientId = getNaverMapsNcpClientId();

  useEffect(() => {
    if (typeof window === "undefined" || loading || error) return;
    const container = ref.current;
    if (!container) return;

    if (!clientId) return;

    let cancelled = false;
    let ro: ResizeObserver | null = null;
    let marker: NMaps | null = null;
    let placed = false;

    void loadNaverMapsScript(clientId)
      .then(() => {
        if (cancelled || !ref.current) return;
        const maps = window.naver?.maps;
        if (!maps) {
          setMapErr("Naver Maps SDK missing");
          return;
        }

        const map = new maps.Map(ref.current, {
          center: new maps.LatLng(lat, lng),
          zoom: 14,
          zoomControl: true,
          zoomControlOptions: { position: maps.Position.TOP_RIGHT },
        });
        mapRef.current = map;

        maps.Event.addListener(map, "idle", () => {
          if (cancelled || placed) return;
          placed = true;
          const el = document.createElement("div");
          el.className =
            "flex size-4 rounded-full border-2 border-[var(--bg-surface)] bg-[hsl(220_55%_36%)] shadow-md ring-2 ring-[hsl(220_55%_36%)]/30";
          el.setAttribute("aria-label", label);
          marker = new maps.Marker({
            position: new maps.LatLng(lat, lng),
            map,
            icon: { content: el, anchor: new maps.Point(8, 8) },
          });
          const bounds = new maps.LatLngBounds(
            new maps.LatLng(lat - 0.006, lng - 0.006),
            new maps.LatLng(lat + 0.006, lng + 0.006),
          );
          map.fitBounds(bounds);
        });

        ro = new ResizeObserver(() => map.refresh());
        ro.observe(ref.current);
      })
      .catch((e: Error) => setMapErr(e?.message ?? "Naver Maps load failed"));

    return () => {
      cancelled = true;
      ro?.disconnect();
      if (marker && window.naver?.maps) {
        marker.setMap(null);
      }
      const map = mapRef.current;
      mapRef.current = null;
      if (map && typeof map.destroy === "function") map.destroy();
    };
  }, [lat, lng, label, loading, error, clientId]);

  if (!loading && !error && (!clientId || clientId === "...")) {
    return (
      <div
        className={cn(
          "text-muted-foreground flex min-h-[200px] items-center justify-center rounded-[var(--radius-card)] bg-[var(--warning-soft)] px-4 text-center text-sm",
          className,
        )}
        role="alert"
      >
        {t("mapLoadFailed", { detail: "NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID missing" })}
      </div>
    );
  }

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

  return (
    <div
      ref={ref}
      className={cn("h-[220px] min-h-[200px] w-full overflow-hidden rounded-[var(--radius-card)]", className)}
      role="region"
      aria-label={label}
    />
  );
}
