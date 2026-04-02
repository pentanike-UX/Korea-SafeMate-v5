/**
 * 한국관광공사 TourAPI (공공데이터포털) KorService1
 * - searchKeyword1: 키워드 검색
 * - detailCommon1: 공통 상세(overview 등)
 *
 * @see https://api.visitkorea.or.kr/ (가이드 PDF)
 * Base: https://apis.data.go.kr/B551011/KorService1
 */

const KOR_SERVICE_BASE = "https://apis.data.go.kr/B551011/KorService1";

/** 대표 이미지가 없을 때 쓰는 플레이스홀더(필요 시 클라이언트에서도 동일 URL 사용 가능) */
export const TOUR_SPOT_PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80&auto=format&fit=crop";

export type TourSpotLookupOk = {
  ok: true;
  query: string;
  contentId: string;
  contentTypeId: string;
  title: string;
  /** firstimage → firstimage2 순, 둘 다 없으면 null */
  imageUrl: string | null;
  /** detailCommon1 overview, 없으면 null */
  overview: string | null;
};

export type TourSpotLookupFail = {
  ok: false;
  code: "NO_API_KEY" | "BAD_QUERY" | "NOT_FOUND" | "API_ERROR" | "UPSTREAM";
  message: string;
};

export type TourSpotLookupResult = TourSpotLookupOk | TourSpotLookupFail;

type TourResponseHeader = { resultCode?: string; resultMsg?: string };

function getServiceKey(): string | null {
  const k = process.env.TOUR_API_KEY?.trim();
  return k && k.length > 0 ? k : null;
}

function getMobileApp(): string {
  return process.env.TOUR_API_APP_NAME?.trim() || "KoreaSafeMate";
}

function normalizeItemArray(raw: unknown): Record<string, unknown>[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  if (typeof raw === "object") return [raw as Record<string, unknown>];
  return [];
}

function readTourHeader(body: unknown): TourResponseHeader | null {
  if (!body || typeof body !== "object") return null;
  const r = body as { response?: { header?: TourResponseHeader } };
  return r.response?.header ?? null;
}

function isTourOkCode(code: string | number | undefined): boolean {
  if (code === undefined || code === null) return true;
  const s = String(code);
  return s === "0" || s === "0000";
}

function readItems(body: unknown): Record<string, unknown>[] {
  if (!body || typeof body !== "object") return [];
  const r = body as {
    response?: { body?: { items?: { item?: unknown } } };
  };
  const item = r.response?.body?.items?.item;
  return normalizeItemArray(item);
}

/** TourAPI overview 등에 포함된 단순 HTML 정리 */
export function stripTourOverviewHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function pickImageUrl(item: Record<string, unknown>): string | null {
  const a = item.firstimage;
  const b = item.firstimage2;
  const u1 = typeof a === "string" && a.trim().length > 0 ? a.trim() : "";
  const u2 = typeof b === "string" && b.trim().length > 0 ? b.trim() : "";
  const url = u1 || u2;
  return url || null;
}

function encodeServiceKeyForQuery(key: string): string {
  // 공공데이터포털「일반 인증키(Encoding)」는 이미 퍼센트 인코딩된 값 → 이중 인코딩하면 실패
  if (/%[0-9A-Fa-f]{2}/.test(key)) return key;
  return encodeURIComponent(key);
}

function buildUrl(path: string, params: Record<string, string>): string {
  const key = getServiceKey();
  if (!key) throw new Error("NO_KEY");
  const search = new URLSearchParams(params);
  const qs = search.toString();
  return `${KOR_SERVICE_BASE}/${path}?serviceKey=${encodeServiceKeyForQuery(key)}&${qs}`;
}

/**
 * searchKeyword1 — 키워드로 관광지 검색, 첫 번째 결과의 식별자·이미지·제목 반환
 */
export async function tourSearchKeywordFirst(
  keyword: string,
  init?: RequestInit,
): Promise<
  | { ok: true; contentId: string; contentTypeId: string; title: string; imageUrl: string | null }
  | { ok: false; code: TourSpotLookupFail["code"]; message: string }
> {
  const q = keyword.trim();
  if (q.length < 1 || q.length > 200) {
    return { ok: false, code: "BAD_QUERY", message: "검색어는 1~200자여야 합니다." };
  }
  if (!getServiceKey()) {
    return { ok: false, code: "NO_API_KEY", message: "TOUR_API_KEY가 설정되지 않았습니다." };
  }

  const url = buildUrl("searchKeyword1", {
    numOfRows: "10",
    pageNo: "1",
    MobileOS: "ETC",
    MobileApp: getMobileApp(),
    _type: "json",
    keyword: q,
  });

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { Accept: "application/json", ...(init?.headers ?? {}) },
      next: init?.next,
    });
  } catch (e) {
    return {
      ok: false,
      code: "UPSTREAM",
      message: e instanceof Error ? e.message : "TourAPI 요청 실패",
    };
  }

  if (!res.ok) {
    return { ok: false, code: "UPSTREAM", message: `TourAPI HTTP ${res.status}` };
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { ok: false, code: "UPSTREAM", message: "TourAPI JSON 파싱 실패" };
  }

  const header = readTourHeader(body);
  if (header?.resultCode != null && !isTourOkCode(header.resultCode as string | number)) {
    return {
      ok: false,
      code: "API_ERROR",
      message: header.resultMsg || `TourAPI 오류 ${header.resultCode}`,
    };
  }

  const items = readItems(body);
  if (items.length === 0) {
    return { ok: false, code: "NOT_FOUND", message: "검색 결과가 없습니다." };
  }

  const first = items[0]!;
  const contentId = String(first.contentid ?? first.contentId ?? "");
  const contentTypeId = String(first.contenttypeid ?? first.contentTypeId ?? "");
  const title = String(first.title ?? "").trim();
  const imageUrl = pickImageUrl(first);

  if (!contentId || !contentTypeId) {
    return { ok: false, code: "NOT_FOUND", message: "유효한 관광 콘텐츠를 찾지 못했습니다." };
  }

  return { ok: true, contentId, contentTypeId, title, imageUrl };
}

/**
 * detailCommon1 — contentId + contentTypeId로 공통정보(overview 등) 조회
 */
export async function tourDetailCommon(
  contentId: string,
  contentTypeId: string,
  init?: RequestInit,
): Promise<
  | { ok: true; overview: string | null; title?: string }
  | { ok: false; code: TourSpotLookupFail["code"]; message: string }
> {
  if (!getServiceKey()) {
    return { ok: false, code: "NO_API_KEY", message: "TOUR_API_KEY가 설정되지 않았습니다." };
  }

  const url = buildUrl("detailCommon1", {
    contentId,
    contentTypeId,
    MobileOS: "ETC",
    MobileApp: getMobileApp(),
    _type: "json",
    defaultYN: "Y",
    firstImageYN: "Y",
    addrinfoYN: "Y",
    mapinfoYN: "N",
    overviewYN: "Y",
  });

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { Accept: "application/json", ...(init?.headers ?? {}) },
      next: init?.next,
    });
  } catch (e) {
    return {
      ok: false,
      code: "UPSTREAM",
      message: e instanceof Error ? e.message : "TourAPI 요청 실패",
    };
  }

  if (!res.ok) {
    return { ok: false, code: "UPSTREAM", message: `TourAPI HTTP ${res.status}` };
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { ok: false, code: "UPSTREAM", message: "TourAPI JSON 파싱 실패" };
  }

  const header = readTourHeader(body);
  if (header?.resultCode != null && !isTourOkCode(header.resultCode as string | number)) {
    return {
      ok: false,
      code: "API_ERROR",
      message: header.resultMsg || `TourAPI 오류 ${header.resultCode}`,
    };
  }

  const items = readItems(body);
  const item = items[0];
  if (!item) {
    return { ok: true, overview: null };
  }

  const ov = item.overview;
  const overviewRaw = typeof ov === "string" && ov.trim().length > 0 ? ov.trim() : null;
  const overview = overviewRaw ? stripTourOverviewHtml(overviewRaw) : null;
  const title = typeof item.title === "string" ? item.title.trim() : undefined;

  return { ok: true, overview, title };
}

/**
 * 키워드 검색 → 첫 결과 → detailCommon1까지 한 번에
 */
export async function lookupTourSpotByKeyword(
  keyword: string,
  init?: RequestInit,
): Promise<TourSpotLookupResult> {
  const search = await tourSearchKeywordFirst(keyword, init);
  if (!search.ok) {
    return { ok: false, code: search.code, message: search.message };
  }

  const detail = await tourDetailCommon(search.contentId, search.contentTypeId, init);
  if (!detail.ok) {
    return {
      ok: true,
      query: keyword.trim(),
      contentId: search.contentId,
      contentTypeId: search.contentTypeId,
      title: search.title,
      imageUrl: search.imageUrl,
      overview: null,
    };
  }

  return {
    ok: true,
    query: keyword.trim(),
    contentId: search.contentId,
    contentTypeId: search.contentTypeId,
    title: detail.title || search.title,
    imageUrl: search.imageUrl,
    overview: detail.overview,
  };
}
