"use client";

import { SliderTablet } from "./SliderTablet";
import { BottomSheetMobile } from "./BottomSheetMobile";

export { CascaderDesktop } from "./CascaderDesktop";
export { SliderTablet } from "./SliderTablet";
export { BottomSheetMobile } from "./BottomSheetMobile";
export {
  REGIONS,
  LEVEL1_OPTIONS,
  formatRegionDisplay,
  parseRegionDraft,
  getZoneSuggestionsForRegion,
} from "./regionData";
export { useMdUp } from "./use-breakpoints";

type Props = {
  mdUp: boolean;
  initialValue: string;
  onApply: (display: string) => void;
  onClose: () => void;
};

/** 태블릿·모바일: 전체 화면 오버레이 (lg 미만에서만 사용) */
export function RegionPickerOverlay({ mdUp, initialValue, onApply, onClose }: Props) {
  return (
    <div
      className={`fixed inset-0 z-[80] flex justify-center ${
        mdUp ? "items-center p-4" : "items-end"
      }`}
      style={{ background: "rgba(10,10,10,0.45)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="v5-region-picker-title"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="닫기" onClick={onClose} />
      <div
        className={`relative z-[81] flex w-full flex-col bg-[var(--bg-elevated)] shadow-2xl border border-[var(--border-default)] overflow-hidden ${
          mdUp
            ? "max-w-lg max-h-[min(72vh,560px)] rounded-2xl"
            : "max-h-[min(70dvh,620px)] rounded-t-2xl border-b-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <span id="v5-region-picker-title" className="sr-only">
          여행 지역 선택
        </span>
        {mdUp ? (
          <SliderTablet initialValue={initialValue} onApply={onApply} onClose={onClose} />
        ) : (
          <BottomSheetMobile initialValue={initialValue} onApply={onApply} onClose={onClose} />
        )}
      </div>
    </div>
  );
}
