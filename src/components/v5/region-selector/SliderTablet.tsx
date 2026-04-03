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

export function SliderTablet({ initialValue, onApply, onClose }: Props) {
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

  const tile =
    "min-h-[44px] rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-subtle)]/60 px-3 py-2.5 text-left text-[13px] font-medium text-[var(--text-strong)] hover:bg-[var(--brand-trust-blue-soft)] hover:border-[var(--brand-trust-blue)]/20 active:scale-[0.99] transition-all";

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex items-center gap-2 border-b border-[var(--border-default)] px-3 py-3 shrink-0">
        {step > 0 ? (
          <button
            type="button"
            onClick={goBack}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-surface-subtle)] text-[var(--text-strong)]"
            aria-label="뒤로"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : (
          <div className="w-10" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-[var(--text-strong)]">여행 지역</p>
          <p className="text-[11px] text-[var(--text-muted)] truncate">{crumb || "광역부터 선택"}</p>
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
          className="text-[11px] font-semibold text-[var(--text-muted)] px-2 py-1"
        >
          초기화
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-surface-subtle)] text-[var(--text-muted)]"
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden relative">
        <div
          className="flex h-full w-[300%] transition-transform duration-200 ease-out"
          style={{ transform: `translateX(-${(step * 100) / 3}%)` }}
        >
          <div className="w-1/3 min-h-0 overflow-y-auto overscroll-contain p-3 shrink-0">
            <div className="grid grid-cols-2 gap-2">
              {LEVEL1_OPTIONS.map((k) => (
                <button
                  key={k}
                  type="button"
                  className={tile}
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
          </div>
          <div className="w-1/3 min-h-0 overflow-y-auto overscroll-contain p-3 shrink-0">
            <div className="grid grid-cols-2 gap-2">
              {l2List.map((k) => (
                <button
                  key={k}
                  type="button"
                  className={tile}
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
          </div>
          <div className="w-1/3 min-h-0 overflow-y-auto overscroll-contain p-3 shrink-0 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              {l3List.map((k) => (
                <button
                  key={k}
                  type="button"
                  className={tile}
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
              className="w-full rounded-2xl bg-[var(--brand-primary)] py-3 text-[14px] font-semibold text-[var(--text-on-brand)] disabled:opacity-40"
            >
              여기(시·군·구)로 선택
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--border-default)] px-3 py-2.5 shrink-0 bg-[var(--bg-page)] flex gap-2">
        <input
          type="text"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="직접 입력"
          className="flex-1 min-w-0 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-[13px] text-[var(--text-strong)]"
        />
        <button
          type="button"
          disabled={!manual.trim()}
          onClick={() => manual.trim() && onApply(manual.trim())}
          className="shrink-0 rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-[12px] font-semibold text-[var(--text-on-brand)] disabled:opacity-40"
        >
          적용
        </button>
      </div>
    </div>
  );
}
