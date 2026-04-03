"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, X } from "lucide-react";
import {
  REGIONS,
  LEVEL1_OPTIONS,
  formatRegionDisplay,
  parseRegionDraft,
  type RegionPick,
} from "./regionData";

type Props = {
  initialValue: string;
  onApply: (display: string) => void;
  onClose: () => void;
};

export function BottomSheetMobile({ initialValue, onApply, onClose }: Props) {
  const parsed = useMemo(() => parseRegionDraft(initialValue), [initialValue]);
  const [step, setStep] = useState<0 | 1 | 2>(() => (parsed.level1 ? (parsed.level2 ? 2 : 1) : 0));
  const [l1, setL1] = useState<string | null>(parsed.level1);
  const [l2, setL2] = useState<string | null>(parsed.level2);
  const [l3, setL3] = useState<string | null>(parsed.level3);
  const [manual, setManual] = useState("");

  const pick: RegionPick = { level1: l1, level2: l2, level3: l3 };
  const crumb = formatRegionDisplay(pick);
  const l2List = l1 ? Object.keys(REGIONS[l1] ?? {}) : [];
  const l3List = l1 && l2 ? REGIONS[l1]![l2]! ?? [] : [];

  const apply = (p: RegionPick) => {
    onApply(formatRegionDisplay(p));
  };

  const goBack = () => {
    if (step === 2) {
      setStep(1);
      setL3(null);
    } else if (step === 1) {
      setStep(0);
      setL2(null);
      setL3(null);
    }
  };

  const row =
    "w-full min-h-[48px] rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-subtle)]/60 px-4 py-3 text-left text-[15px] font-medium text-[var(--text-strong)] hover:bg-[var(--brand-trust-blue-soft)] active:scale-[0.99] transition-all";

  return (
    <div className="flex flex-col min-h-0 flex-1 max-h-[min(70dvh,560px)]">
      <div
        className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-[var(--border-default)] opacity-80"
        aria-hidden
      />
      <div className="flex items-center gap-2 border-b border-[var(--border-default)] px-3 py-2 shrink-0">
        {step > 0 ? (
          <button
            type="button"
            onClick={goBack}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bg-surface-subtle)]"
            aria-label="뒤로"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : (
          <div className="w-11" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[16px] font-semibold text-[var(--text-strong)]">어디로 가시나요?</p>
          <p className="text-[12px] text-[var(--text-muted)] truncate">{crumb || "지역을 선택하세요"}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setL1(null);
            setL2(null);
            setL3(null);
            setStep(0);
            onApply("");
          }}
          className="text-[12px] font-semibold text-[var(--text-muted)] px-2 py-2"
        >
          초기화
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bg-surface-subtle)] text-[var(--text-muted)]"
          aria-label="닫기"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden relative touch-pan-y">
        <div
          className="flex h-full w-[300%] transition-transform duration-200 ease-out"
          style={{ transform: `translateX(-${(step * 100) / 3}%)` }}
        >
          <div className="w-1/3 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-2 shrink-0">
            {LEVEL1_OPTIONS.map((k) => (
              <button
                key={k}
                type="button"
                className={row}
                onClick={() => {
                  setL1(k);
                  setL2(null);
                  setL3(null);
                  setStep(1);
                }}
              >
                {k}
              </button>
            ))}
          </div>
          <div className="w-1/3 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-2 shrink-0">
            {l2List.map((k) => (
              <button
                key={k}
                type="button"
                className={row}
                onClick={() => {
                  setL2(k);
                  setL3(null);
                  setStep(2);
                }}
              >
                {k}
              </button>
            ))}
          </div>
          <div className="w-1/3 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-3 shrink-0 flex flex-col">
            <div className="space-y-2 flex-1 min-h-0 overflow-y-auto">
              {l3List.map((k) => (
                <button
                  key={k}
                  type="button"
                  className={row}
                  onClick={() => {
                    if (l1 && l2) apply({ level1: l1, level2: l2, level3: k });
                  }}
                >
                  {k}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={!l1 || !l2}
              onClick={() => l1 && l2 && apply({ level1: l1, level2: l2, level3: null })}
              className="w-full min-h-[48px] rounded-2xl bg-[var(--brand-primary)] text-[15px] font-semibold text-[var(--text-on-brand)] disabled:opacity-40 shrink-0"
            >
              선택 완료 (동네 생략)
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--border-default)] px-3 py-3 shrink-0 bg-[var(--bg-page)] pb-[max(0.75rem,env(safe-area-inset-bottom))] flex gap-2">
        <input
          type="text"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="직접 입력"
          className="flex-1 min-w-0 min-h-[48px] rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 text-[15px] text-[var(--text-strong)]"
        />
        <button
          type="button"
          disabled={!manual.trim()}
          onClick={() => manual.trim() && onApply(manual.trim())}
          className="shrink-0 min-h-[48px] rounded-xl bg-[var(--brand-trust-blue-soft)] px-4 text-[14px] font-semibold text-[var(--brand-trust-blue)] disabled:opacity-40"
        >
          적용
        </button>
      </div>
    </div>
  );
}
