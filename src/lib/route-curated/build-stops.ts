import type { CuratedRoute } from "@/domain/curated-experience";
import type { CuratedMapStop } from "@/components/route-curated/curated-route-map-inner";
import type { Spot } from "@/domain/curated-experience";

export function buildCuratedMapStops(route: CuratedRoute, getSpot: (spotId: string) => Spot | undefined): CuratedMapStop[] {
  const sorted = [...route.stops].sort((a, b) => a.order - b.order);
  return sorted
    .map((rs) => {
      const spot = getSpot(rs.spotId);
      if (!spot) return null;
      return {
        id: rs.id,
        order: rs.order,
        lat: spot.coordinates.lat,
        lng: spot.coordinates.lng,
        title: spot.name,
      };
    })
    .filter((x): x is CuratedMapStop => Boolean(x));
}
