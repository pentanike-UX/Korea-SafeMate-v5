import type { LatLng } from "@/domain/curated-experience";

/** GeoJSON LineString for MapLibre route layers (street-following coordinates). */
export function routePolylineFeature(coords: [number, number][]): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "LineString", coordinates: coords.length >= 2 ? coords : [] },
  };
}

export function latLngPathToLngLatCoords(path: LatLng[]): [number, number][] {
  return path.map((p) => [p.lng, p.lat] as [number, number]);
}
