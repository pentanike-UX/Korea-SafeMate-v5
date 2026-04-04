/**
 * TourAPI searchKeyword2 결과 목록에서 플랜 스팟명·참조 좌표와 가장 잘 맞는 항목 선택
 */

/**
 * 관광지 동의어 사전: LLM이 생성하는 일상 표현 ↔ TourAPI 공식 명칭 매핑.
 * 양방향 정규화에 사용하여 매칭률을 높입니다.
 */
const SYNONYM_PAIRS: [string, string][] = [
  ["해변", "해수욕장"],
  ["바다", "해수욕장"],
  ["바닷가", "해수욕장"],
  ["시장", "전통시장"],
  ["재래시장", "전통시장"],
  ["야시장", "야간시장"],
  ["절", "사찰"],
  ["성", "성곽"],
  ["산성", "성곽"],
  ["왕궁", "궁"],
  ["궁궐", "궁"],
  ["숲", "자연휴양림"],
  ["폭포", "폭포"],
  ["온천", "온천"],
  ["해돋이", "일출"],
  ["전망대", "전망"],
  ["케이블카", "곤돌라"],
  ["카페거리", "카페"],
  ["먹자골목", "먹거리"],
  ["맛집거리", "먹거리"],
  ["벽화마을", "벽화"],
  ["한옥마을", "한옥"],
  ["올레길", "올레"],
  ["둘레길", "둘레"],
  ["해안도로", "해안"],
  ["수목원", "수목원"],
  ["식물원", "식물원"],
  ["미술관", "미술관"],
  ["박물관", "박물관"],
  ["기념관", "기념관"],
];

/** 동의어 정규화: "해운대 해변" → "해운대 해수욕장" 등 */
function applySynonyms(s: string): string {
  let result = s;
  for (const [from, to] of SYNONYM_PAIRS) {
    if (result.includes(from) && !result.includes(to)) {
      result = result.replace(from, to);
    }
  }
  return result;
}

function normalizeMatchKey(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\s"'()[\]「」·,.，、]/g, "")
    .trim();
}

/** @internal 테스트·디버그용 */
export function scoreTourTitleMatch(matchName: string, apiTitle: string): number {
  const a = normalizeMatchKey(matchName);
  const b = normalizeMatchKey(apiTitle);
  if (!a || !b) return 0;
  if (a === b) return 1000;
  if (b.includes(a) || a.includes(b)) return 850;

  // 동의어 정규화 후 재비교
  const aSyn = normalizeMatchKey(applySynonyms(matchName));
  const bSyn = normalizeMatchKey(applySynonyms(apiTitle));
  if (aSyn === bSyn) return 980;
  if (bSyn.includes(aSyn) || aSyn.includes(bSyn)) return 830;

  // 최장 공통 부분문자열
  let best = 0;
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      let k = 0;
      while (i + k < a.length && j + k < b.length && a[i + k] === b[j + k]) k++;
      best = Math.max(best, k);
    }
  }
  const ratio = best / Math.max(a.length, b.length, 1);
  return Math.round(ratio * 600);
}

function parseTourScalar(raw: unknown): number | null {
  if (raw == null) return null;
  let n: number;
  if (typeof raw === "number") n = raw;
  else if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return null;
    n = parseFloat(t);
  } else return null;
  if (!Number.isFinite(n)) return null;
  if (Math.abs(n) > 1000 && Number.isInteger(n)) {
    const scaled = n / 10_000_000;
    if (Math.abs(scaled) < 200) return scaled;
  }
  return n;
}

/**
 * KorService 검색 결과: mapx=경도, mapy=위도 (WGS84 소수 또는 ×1e7 정수).
 * 한국 근처가 아니면 null (KATECH 등 오판 방지).
 */
export function latLngFromTourSearchItem(item: Record<string, unknown>): {
  lat: number;
  lng: number;
} | null {
  const lng = parseTourScalar(item.mapx ?? item.mapX);
  const lat = parseTourScalar(item.mapy ?? item.mapY);
  if (lat == null || lng == null) return null;
  if (lat < 32.5 || lat > 39.5 || lng < 122 || lng > 134) return null;
  return { lat, lng };
}

function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function geoScoreBonus(
  ref: { lat: number; lng: number },
  item: Record<string, unknown>,
): number {
  const ll = latLngFromTourSearchItem(item);
  if (!ll) return 0;
  const d = haversineKm(ref.lat, ref.lng, ll.lat, ll.lng);
  if (d <= 30) return Math.round(240 - Math.min(d * 7, 240));
  if (d <= 100) return Math.round(100 - (d - 30) * 0.9);
  return 0;
}

export function pickBestTourSearchItem(
  items: Record<string, unknown>[],
  matchName: string,
  ref: { lat: number; lng: number } | null | undefined,
): Record<string, unknown> | null {
  const valid = items.filter((item) => {
    const contentId = String(item.contentid ?? item.contentId ?? "");
    const contentTypeId = String(item.contenttypeid ?? item.contentTypeId ?? "");
    return Boolean(contentId && contentTypeId);
  });
  if (valid.length === 0) return null;

  const hint = matchName.trim();
  let best = valid[0]!;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const item of valid) {
    const title = String(item.title ?? "").trim();
    let score = hint ? scoreTourTitleMatch(hint, title) : 0;
    if (ref && Number.isFinite(ref.lat) && Number.isFinite(ref.lng)) {
      score += geoScoreBonus(ref, item);
    }
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }
  return best;
}

/** 제목 일치가 충분히 높으면 UI에서 별도 안내 생략·Tour 미디어 노출 허용 */
export function tourMatchLooksAligned(matchName: string, pickedTitle: string): boolean {
  return scoreTourTitleMatch(matchName, pickedTitle) >= 520;
}

export type TourMatchConfidence = "high" | "partial" | "low";

/**
 * 매칭 점수를 3단계 신뢰도로 분류:
 * - high (≥520): 이미지·소개·좌표 모두 노출
 * - partial (350~519): 이미지만 노출, 좌표는 보류 (부분 일치)
 * - low (<350): 전부 숨김 (엉뚱한 POI)
 */
export function tourMatchConfidence(matchName: string, pickedTitle: string): TourMatchConfidence {
  const score = scoreTourTitleMatch(matchName, pickedTitle);
  if (score >= 520) return "high";
  if (score >= 350) return "partial";
  return "low";
}
