import { isTourSpotKind, tourLclsForSpotKind } from "./tour-classification";
import type { TourKeywordSearchOptions } from "./tour-keyword-options";
import { inferLegalDongFromRegion } from "./tour-region-ldong";

/**
 * API 쿼리스트링용 → `lookupTourSpotByKeyword`에 그대로 넘김
 */
export function buildTourKeywordSearchOptions(input: {
  spotType?: string | null;
  region?: string | null;
}): TourKeywordSearchOptions {
  const classification =
    input.spotType && isTourSpotKind(input.spotType)
      ? tourLclsForSpotKind(input.spotType)
      : null;
  const r = input.region?.trim();
  const legalDong = r ? inferLegalDongFromRegion(r) : null;
  return { classification, legalDong };
}
