/**
 * 한국관광공사 TourAPI (공공데이터포털) KorService2 — 활용매뉴얼 국문 Ver 4.4 기준
 * - searchKeyword2: 키워드 검색 (관광타입 요청 파라미터는 v4.3에서 삭제, 법정동·분류체계는 선택)
 * - detailCommon2: 공통정보 — 요청은 contentId + 공통 파라미터만 (defaultYN·contentTypeId 등 v4.3에서 삭제)
 *
 * 신분류체계(lclsSystm1/2/3)·법정동(lDong*)은 `TourKeywordSearchOptions`로 선택 전달.
 * 법정동 추정 오류 시에만 완화 단계(필터 제거)로 재시도 — 분류 필터는 유지 우선.
 *
 * @see https://api.visitkorea.or.kr/
 * Base: https://apis.data.go.kr/B551011/KorService2
 */

import type { TourLclsFilter } from "./tour-classification";
import type { TourKeywordSearchOptions } from "./tour-keyword-options";
import type { TourLegalDongFilter } from "./tour-region-ldong";

const KOR_SERVICE_BASE = "https://apis.data.go.kr/B551011/KorService2";

export type { TourKeywordSearchOptions } from "./tour-keyword-options";

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
  /** detailCommon2 overview, 없으면 null */
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

function lclsToParams(l: TourLclsFilter | null | undefined): Record<string, string> {
  if (!l?.lclsSystm1) return {};
  const o: Record<string, string> = { lclsSystm1: l.lclsSystm1 };
  if (l.lclsSystm2) o.lclsSystm2 = l.lclsSystm2;
  if (l.lclsSystm3) o.lclsSystm3 = l.lclsSystm3;
  return o;
}

function legalDongToParams(d: TourLegalDongFilter | null | undefined): Record<string, string> {
  if (!d?.lDongRegnCd) return {};
  const o: Record<string, string> = { lDongRegnCd: d.lDongRegnCd };
  if (d.lDongSignguCd) o.lDongSignguCd = d.lDongSignguCd;
  return o;
}

/** 분류·법정동 조합 → 완화 순서(동 추정 오류 대비 마지막은 키워드만) */
function keywordSearchParamAttempts(
  lcls: Record<string, string>,
  dong: Record<string, string>,
): Record<string, string>[] {
  const hasL = Object.keys(lcls).length > 0;
  const hasD = Object.keys(dong).length > 0;
  const seen = new Set<string>();
  const out: Record<string, string>[] = [];
  const push = (extra: Record<string, string>) => {
    const merged = { ...extra };
    const key = JSON.stringify(merged);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(merged);
  };

  push({ ...lcls, ...dong });
  if (hasL && hasD) {
    push({ ...lcls });
    push({ ...dong });
  }
  if (hasL || hasD) push({});

  return out;
}

type KeywordFirstOk = {
  ok: true;
  contentId: string;
  contentTypeId: string;
  title: string;
  imageUrl: string | null;
};
type KeywordFirstFail = { ok: false; code: TourSpotLookupFail["code"]; message: string };

async function executeSearchKeyword2(
  keyword: string,
  init: RequestInit | undefined,
  extraParams: Record<string, string>,
): Promise<KeywordFirstOk | KeywordFirstFail | { ok: "empty" }> {
  const q = keyword.trim();
  const url = buildUrl("searchKeyword2", {
    numOfRows: "10",
    pageNo: "1",
    MobileOS: "ETC",
    MobileApp: getMobileApp(),
    _type: "json",
    arrange: "C",
    keyword: q,
    ...extraParams,
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
    return { ok: "empty" };
  }

  const first = items[0]!;
  const contentId = String(first.contentid ?? first.contentId ?? "");
  const contentTypeId = String(first.contenttypeid ?? first.contentTypeId ?? "");
  const title = String(first.title ?? "").trim();
  const imageUrl = pickImageUrl(first);

  if (!contentId || !contentTypeId) {
    return { ok: "empty" };
  }

  return { ok: true, contentId, contentTypeId, title, imageUrl };
}

/**
 * searchKeyword2 — 키워드로 관광지 검색, 첫 번째 결과의 식별자·이미지·제목 반환
 * (분류·법정동 필터 및 완화 재시도)
 */
export async function tourSearchKeywordFirst(
  keyword: string,
  init?: RequestInit,
  options?: TourKeywordSearchOptions,
): Promise<KeywordFirstOk | KeywordFirstFail> {
  const q = keyword.trim();
  if (q.length < 1 || q.length > 200) {
    return { ok: false, code: "BAD_QUERY", message: "검색어는 1~200자여야 합니다." };
  }
  if (!getServiceKey()) {
    return { ok: false, code: "NO_API_KEY", message: "TOUR_API_KEY가 설정되지 않았습니다." };
  }

  const lcls = lclsToParams(options?.classification ?? undefined);
  const dong = legalDongToParams(options?.legalDong ?? undefined);
  const attempts = keywordSearchParamAttempts(lcls, dong);

  for (const extra of attempts) {
    const r = await executeSearchKeyword2(q, init, extra);
    if (r.ok === true) return r;
    if (r.ok === false) return r;
  }

  return { ok: false, code: "NOT_FOUND", message: "검색 결과가 없습니다." };
}

/**
 * detailCommon2 — contentId로 공통정보(overview·이미지·주소 등) 조회
 * (v4.4 매뉴얼: 요청에 contentTypeId·defaultYN·overviewYN 등 없음 — 응답에 contenttypeid 포함)
 */
export async function tourDetailCommon(
  contentId: string,
  _contentTypeId?: string,
  init?: RequestInit,
): Promise<
  | { ok: true; overview: string | null; title?: string }
  | { ok: false; code: TourSpotLookupFail["code"]; message: string }
> {
  if (!getServiceKey()) {
    return { ok: false, code: "NO_API_KEY", message: "TOUR_API_KEY가 설정되지 않았습니다." };
  }

  const url = buildUrl("detailCommon2", {
    numOfRows: "10",
    pageNo: "1",
    contentId,
    MobileOS: "ETC",
    MobileApp: getMobileApp(),
    _type: "json",
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
 * 키워드 검색 → 첫 결과 → detailCommon2까지 한 번에
 */
export async function lookupTourSpotByKeyword(
  keyword: string,
  init?: RequestInit,
  options?: TourKeywordSearchOptions,
): Promise<TourSpotLookupResult> {
  const search = await tourSearchKeywordFirst(keyword, init, options);
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
