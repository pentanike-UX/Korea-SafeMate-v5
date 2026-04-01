/** Minimal shapes for NCP Dynamic Map JS v3 (`window.naver.maps`). */

export {};

declare global {
  interface Window {
    naver?: NaverMapsRoot;
  }
}

interface NaverMapsRoot {
  maps: NaverMapsNs;
}

interface NaverMapsNs {
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => NaverMapInstance;
  LatLng: new (lat: number, lng: number) => NaverLatLng;
  LatLngBounds: new (sw: NaverLatLng, ne: NaverLatLng) => NaverLatLngBounds;
  Polyline: new (opts: Record<string, unknown>) => NaverPolyline;
  Marker: new (opts: Record<string, unknown>) => NaverMarker;
  Point: new (x: number, y: number) => NaverPoint;
  Position: { TOP_RIGHT: unknown };
  Event: {
    addListener: (target: unknown, evt: string, fn: (...args: unknown[]) => void) => unknown;
    removeListener: (h: unknown) => void;
  };
}

interface NaverMapInstance {
  destroy?: () => void;
  refresh: () => void;
  fitBounds: (bounds: NaverLatLngBounds) => void;
  getZoom: () => number;
  morph?: (ll: NaverLatLng, zoom: number, opts?: { duration?: number }) => void;
  panTo?: (ll: NaverLatLng, opts?: { duration?: number }) => void;
  setCenter: (ll: NaverLatLng) => void;
  setZoom: (z: number, useEffect?: boolean) => void;
}

interface NaverLatLng {
  lat: () => number;
  lng: () => number;
}

interface NaverLatLngBounds {
  extend: (ll: NaverLatLng) => void;
}

interface NaverPolyline {
  setMap: (m: NaverMapInstance | null) => void;
  setPath: (path: NaverLatLng[]) => void;
}

interface NaverMarker {
  setMap: (m: NaverMapInstance | null) => void;
}

interface NaverPoint {
  x: number;
  y: number;
}
