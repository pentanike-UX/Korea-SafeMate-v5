/**
 * TourAPI searchKeyword2 결과 목록에서 플랜 스팟명·참조 좌표와 가장 잘 맞는 항목 선택
 */

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

/** 제목 일치가 충분히 높으면 UI에서 별도 안내 생략 */
export function tourMatchLooksAligned(matchName: string, pickedTitle: string): boolean {
  return scoreTourTitleMatch(matchName, pickedTitle) >= 450;
}
