/**
 * 도로 라우팅(OSRM/네이버) 밖 구간 — 항공·페리 문-투-문 블록 추정(보수적).
 */

export type PlanTransitMode = "surface" | "flight" | "ferry";

/** 출발지→공항·탑승·하기→목적지까지 포함한 상한에 가깝게 */
const FLIGHT_PRE_SEC = 80 * 60;
const FLIGHT_POST_SEC = 75 * 60;

const FERRY_PRE_SEC = 55 * 60;
const FERRY_POST_SEC = 40 * 60;

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** 자연어에서 이동 수단 추정 (AI가 transitMode를 빼먹었을 때) */
export function inferTransitModeFromSpotText(transitToNext?: string): PlanTransitMode {
  const t = (transitToNext ?? "").trim();
  if (!t) return "surface";
  if (/비행|항공|비행기|\bLCC\b|항공편|공항\s*→|→\s*공항|domestic\s*flight/i.test(t)) return "flight";
  if (/페리|여객선|배편|도항|왕복선/i.test(t)) return "ferry";
  return "surface";
}

export type SurfaceProfile = "foot" | "driving";

/**
 * surface 구간에서 도보/차량 판별.
 * LLM의 transitToNext 텍스트("택시 10분", "도보 5분" 등)를 파싱하여
 * OSRM/네이버에 보낼 profile(foot vs driving)을 결정합니다.
 */
export function inferSurfaceProfileFromText(transitToNext?: string): SurfaceProfile | null {
  const t = (transitToNext ?? "").trim().toLowerCase();
  if (!t) return null;

  if (/도보|걸어|걸어서|산책|걸으|walking|on\s*foot/.test(t)) return "foot";

  if (
    /차로|차량|자동차|렌터카|렌트카|자차|택시|버스|셔틀|시외버스|고속버스|시내버스|마을버스|지하철|전철|KTX|SRT|기차|열차|driving|by\s*car|taxi|bus/.test(t)
  ) {
    return "driving";
  }

  return null;
}

/** 대권 거리(km) 기반 국내선 비행 블록(분)→초 */
function airBlockSecondsFromKm(km: number): number {
  const airMin = Math.round(28 + km * 0.42);
  const clamped = Math.min(95, Math.max(38, airMin));
  return FLIGHT_PRE_SEC + clamped * 60 + FLIGHT_POST_SEC;
}

/** 김포↔제주 등 알려진 페어는 테이블 우선 (좌표 근접 시) */
const AIRPORT_ANCHORS: { name: string; lat: number; lng: number; rKm: number }[] = [
  { name: "GMP", lat: 37.5583, lng: 126.7906, rKm: 25 },
  { name: "ICN", lat: 37.4602, lng: 126.4407, rKm: 30 },
  { name: "CJU", lat: 33.5064, lng: 126.4929, rKm: 35 },
  { name: "PUS", lat: 35.1795, lng: 128.9382, rKm: 30 },
  { name: "TAE", lat: 35.8941, lng: 128.6588, rKm: 25 },
  { name: "KWJ", lat: 35.1261, lng: 126.8056, rKm: 25 },
  { name: "RSU", lat: 38.073, lng: 127.5, rKm: 40 },
];

function nearAirport(p: { lat: number; lng: number }): string | null {
  for (const ap of AIRPORT_ANCHORS) {
    if (haversineKm(p, { lat: ap.lat, lng: ap.lng }) <= ap.rKm) return ap.name;
  }
  return null;
}

/** 테이블 매칭 시 비행 순항+절차만(분); pre/post는 별도 */
const KNOWN_AIR_MINUTES: Record<string, number> = {
  "GMP-CJU": 70,
  "CJU-GMP": 70,
  "ICN-CJU": 75,
  "CJU-ICN": 75,
  "GMP-PUS": 55,
  "PUS-GMP": 55,
  "ICN-PUS": 60,
  "PUS-ICN": 60,
  "GMP-TAE": 50,
  "TAE-GMP": 50,
  "GMP-KWJ": 45,
  "KWJ-GMP": 45,
};

export function estimateFlightLegSeconds(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): { seconds: number; distanceMeters: number } {
  const km = haversineKm(a, b);
  const distanceMeters = Math.round(km * 1000);
  const na = nearAirport(a);
  const nb = nearAirport(b);
  let airMin: number;
  if (na && nb) {
    const key1 = `${na}-${nb}`;
    const key2 = `${nb}-${na}`;
    airMin = KNOWN_AIR_MINUTES[key1] ?? KNOWN_AIR_MINUTES[key2] ?? Math.round(28 + km * 0.42);
  } else {
    airMin = Math.round(28 + km * 0.42);
  }
  const clamped = Math.min(100, Math.max(35, airMin));
  return {
    seconds: FLIGHT_PRE_SEC + clamped * 60 + FLIGHT_POST_SEC,
    distanceMeters,
  };
}

/** 해상 거리를 대권으로 근사, 평균 운항 속도로 순항 시간 추정 */
export function estimateFerryLegSeconds(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): { seconds: number; distanceMeters: number } {
  const km = haversineKm(a, b);
  const distanceMeters = Math.round(km * 1000);
  const seaHours = Math.max(0.9, km / 32);
  const seaSec = Math.round(seaHours * 3600);
  return {
    seconds: FERRY_PRE_SEC + seaSec + FERRY_POST_SEC,
    distanceMeters,
  };
}
