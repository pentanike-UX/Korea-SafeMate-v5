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

/** 공공데이터포털 일일 할당량 보호: 동시 Tour API 호출 수 제한 */
const TOUR_CONCURRENCY = 3;

type TourSpotResponse =
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
      matchConfidence?: "high" | "partial" | "low";
    }
  | { ok: false };

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

    async function fetchSpot(spot: PlanForTourEnrichment["spots"][number]) {
      try {
        const r = await fetch(tourSpotApiUrl(spot, plan.region), {
          signal: ac.signal,
        });
        const j = (await r.json()) as TourSpotResponse;
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
    }

    async function runWithConcurrency() {
      const queue = [...plan.spots];
      const workers = Array.from({ length: TOUR_CONCURRENCY }, async () => {
        while (queue.length > 0 && !ac.signal.aborted) {
          const spot = queue.shift();
          if (spot) await fetchSpot(spot);
        }
      });
      await Promise.allSettled(workers);
    }

    void runWithConcurrency();
    return () => ac.abort();
  }, [plan.id, plan.region, key]);

  return tourBySpotId;
}
