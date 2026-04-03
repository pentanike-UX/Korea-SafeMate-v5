import { NextRequest, NextResponse } from "next/server";
import {
  lookupTourSpotByKeyword,
  TOUR_SPOT_PLACEHOLDER_IMAGE,
} from "@/lib/tour-api/kor-service-lookup.server";
import { buildTourKeywordSearchOptions } from "@/lib/tour-api/tour-spot-filters";
import { isTourSpotKind } from "@/lib/tour-api/tour-classification";

export const runtime = "nodejs";

function parseRefCoord(raw: string | null): number | null {
  if (raw == null || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * GET /api/tour/spot?q=…&spotType=food&region=제주
 * 선택: matchName(플랜 스팟명), refLat/refLng(LLM 좌표) — 검색 후보 재순위
 * TourAPI KorService2: searchKeyword2(+분류·법정동) → detailCommon2 (활용매뉴얼 국문 v4.4)
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json(
      { ok: false, code: "BAD_QUERY", message: "쿼리 파라미터 q가 필요합니다." },
      { status: 400 },
    );
  }

  const spotTypeRaw = req.nextUrl.searchParams.get("spotType")?.trim() ?? "";
  if (spotTypeRaw && !isTourSpotKind(spotTypeRaw)) {
    return NextResponse.json(
      {
        ok: false,
        code: "BAD_QUERY",
        message: "spotType은 attraction|food|cafe|transport|hotel 중 하나여야 합니다.",
      },
      { status: 400 },
    );
  }

  const regionHint = req.nextUrl.searchParams.get("region")?.trim() ?? "";
  const matchName = req.nextUrl.searchParams.get("matchName")?.trim() ?? "";
  const refLat = parseRefCoord(req.nextUrl.searchParams.get("refLat"));
  const refLng = parseRefCoord(req.nextUrl.searchParams.get("refLng"));

  const filterOpts = buildTourKeywordSearchOptions({
    spotType: spotTypeRaw || null,
    region: regionHint || null,
  });

  const result = await lookupTourSpotByKeyword(q, undefined, filterOpts, {
    matchName: matchName || null,
    refLat,
    refLng,
  });

  if (!result.ok) {
    /** NOT_FOUND는 클라이언트가 스팟마다 반복 호출하므로 404 대신 200으로 두어 콘솔·네트워크 탭 노이즈 감소 */
    const status =
      result.code === "NOT_FOUND"
        ? 200
        : result.code === "NO_API_KEY"
          ? 503
          : result.code === "BAD_QUERY"
            ? 400
            : 502;
    return NextResponse.json(
      { ok: false, code: result.code, message: result.message },
      { status },
    );
  }

  /** 플랜 스팟명과 검색 제목이 맞지 않으면 이미지·소개·좌표를 내리지 않음(엉뚱한 POI 노출 방지) */
  const stripMisaligned =
    matchName.length > 0 && !result.alignsWithPlanName;
  const imageUrl = stripMisaligned ? null : result.imageUrl;
  const overview = stripMisaligned ? null : result.overview;
  const matchedLat = stripMisaligned ? null : result.matchedLat;
  const matchedLng = stripMisaligned ? null : result.matchedLng;
  const displayImageUrl = imageUrl ?? TOUR_SPOT_PLACEHOLDER_IMAGE;

  return NextResponse.json({
    ok: true,
    query: result.query,
    contentId: result.contentId,
    contentTypeId: result.contentTypeId,
    title: stripMisaligned ? "" : result.title,
    imageUrl,
    displayImageUrl,
    overview,
    matchedLat,
    matchedLng,
    /** 보강을 숨긴 경우 UI는 타입 아이콘만 쓰도록 일치로 표시 */
    alignsWithPlanName: stripMisaligned ? true : result.alignsWithPlanName,
  });
}
