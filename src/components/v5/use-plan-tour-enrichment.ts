"use client";

import { useEffect, useMemo, useState } from "react";
import type { SpotTourEnrichment } from "@/lib/tour-api/tour-spot-client";
import { tourSpotApiUrl } from "@/lib/tour-api/tour-spot-client";

export type PlanForTourEnrichment = {
  id: string;
  region: string;
  spots: Array<{
    id: string;
    name: string;
    type: string;
    lat?: number | null;
    lng?: number | null;
  }>;
};

export function usePlanTourEnrichment(plan: PlanForTourEnrichment) {
  const [tourBySpotId, setTourBySpotId] = useState<
    Record<string, SpotTourEnrichment | "err" | undefined>
  >({});

  const key = useMemo(
    () =>
      plan.spots.map((s) => `${s.id}:${s.name}:${s.lat ?? ""}:${s.lng ?? ""}`).join("|"),
    [plan.spots],
  );

  useEffect(() => {
    const ac = new AbortController();
    for (const spot of plan.spots) {
      void (async () => {
        try {
          const r = await fetch(tourSpotApiUrl(spot, plan.region), {
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
                matchedLat?: number | null;
                matchedLng?: number | null;
                alignsWithPlanName?: boolean;
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
                matchedLat: j.matchedLat ?? null,
                matchedLng: j.matchedLng ?? null,
                alignsWithPlanName: j.alignsWithPlanName ?? true,
              },
            }));
          } else {
            setTourBySpotId((prev) => ({ ...prev, [spot.id]: "err" }));
          }
        } catch {
          if (!ac.signal.aborted) {
            setTourBySpotId((prev) => ({ ...prev, [spot.id]: "err" }));
          }
        }
      })();
    }
    return () => ac.abort();
  }, [plan.id, plan.region, key]);

  return tourBySpotId;
}
