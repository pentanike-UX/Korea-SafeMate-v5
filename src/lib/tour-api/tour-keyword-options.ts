import type { TourLclsFilter } from "./tour-classification";
import type { TourLegalDongFilter } from "./tour-region-ldong";

/** searchKeyword2 호출 시 선택 분류·법정동 필터 */
export type TourKeywordSearchOptions = {
  classification?: TourLclsFilter | null;
  legalDong?: TourLegalDongFilter | null;
};
