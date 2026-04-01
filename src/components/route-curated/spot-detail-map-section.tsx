"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

const SpotPinMap = dynamic(
  () => import("@/components/route-curated/spot-pin-map").then((m) => ({ default: m.SpotPinMap })),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted/50 h-[220px] w-full animate-pulse rounded-[var(--radius-card)]" aria-hidden />
    ),
  },
);

export function SpotDetailMapSection({ lat, lng, label }: { lat: number; lng: number; label: string }) {
  const t = useTranslations("V4.spotDetail");

  return (
    <section className="mt-8" aria-labelledby="spot-map-heading">
      <h2 id="spot-map-heading" className="text-[var(--text-strong)] mb-3 text-sm font-semibold tracking-wide uppercase">
        {t("mapRegion")}
      </h2>
      <SpotPinMap key={`${lat.toFixed(5)}-${lng.toFixed(5)}-${label.slice(0, 48)}`} lat={lat} lng={lng} label={label} />
    </section>
  );
}
