import { NextRequest, NextResponse } from "next/server";
import {
  lookupTourSpotByKeyword,
  TOUR_SPOT_PLACEHOLDER_IMAGE,
} from "@/lib/tour-api/kor-service-lookup.server";
import { buildTourKeywordSearchOptions } from "@/lib/tour-api/tour-spot-filters";
import { isTourSpotKind } from "@/lib/tour-api/tour-classification";

export const runtime = "nodejs";

/**
 * GET /api/tour/spot?q=…&spotType=food&region=제주
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
  const filterOpts = buildTourKeywordSearchOptions({
    spotType: spotTypeRaw || null,
    region: regionHint || null,
  });

  const result = await lookupTourSpotByKeyword(q, undefined, filterOpts);

  if (!result.ok) {
    const status =
      result.code === "NO_API_KEY"
        ? 503
        : result.code === "BAD_QUERY"
          ? 400
          : result.code === "NOT_FOUND"
            ? 404
            : 502;
    return NextResponse.json(
      { ok: false, code: result.code, message: result.message },
      { status },
    );
  }

  const displayImageUrl = result.imageUrl ?? TOUR_SPOT_PLACEHOLDER_IMAGE;

  return NextResponse.json({
    ok: true,
    query: result.query,
    contentId: result.contentId,
    contentTypeId: result.contentTypeId,
    title: result.title,
    imageUrl: result.imageUrl,
    displayImageUrl,
    overview: result.overview,
  });
}
