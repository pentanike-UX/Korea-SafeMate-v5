import { NextRequest, NextResponse } from "next/server";
import {
  lookupTourSpotByKeyword,
  TOUR_SPOT_PLACEHOLDER_IMAGE,
} from "@/lib/tour-api/kor-service-lookup.server";

export const runtime = "nodejs";

/**
 * GET /api/tour/spot?q=양양+낙산사
 * TourAPI searchKeyword1 → detailCommon1 묶음 조회
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json(
      { ok: false, code: "BAD_QUERY", message: "쿼리 파라미터 q가 필요합니다." },
      { status: 400 },
    );
  }

  const result = await lookupTourSpotByKeyword(q);

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
