"use client";

import { useCallback, useMemo, useState } from "react";
import { X } from "lucide-react";
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

function colBtn(active: boolean) {
  return `w-full text-left rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors min-h-[36px] ${
    active
      ? "bg-[var(--brand-trust-blue-soft)] text-[var(--brand-trust-blue)] border border-[var(--brand-trust-blue)]/25"
      : "text-[var(--text-strong)] hover:bg-[var(--bg-surface-subtle)] border border-transparent"
  }`;
}

export function CascaderDesktop({ initialValue, onApply, onClose }: Props) {
  const parsed = useMemo(() => parseRegionDraft(initialValue), [initialValue]);
  const [l1, setL1] = useState<string | null>(parsed.level1);
  const [l2, setL2] = useState<string | null>(parsed.level2);
  const [l3, setL3] = useState<string | null>(parsed.level3);
  const [manual, setManual] = useState("");

  const pick: RegionPick = { level1: l1, level2: l2, level3: l3 };
  const breadcrumb = formatRegionDisplay(pick);
  const l2List = l1 ? Object.keys(REGIONS[l1] ?? {}) : [];
  const l3List = l1 && l2 ? REGIONS[l1]![l2]! ?? [] : [];

  const applyPick = useCallback(
    (p: RegionPick) => {
      onApply(formatRegionDisplay(p));
    },
    [onApply],
  );

  const handleL1 = (k: string) => {
    setL1(k);
    setL2(null);
    setL3(null);
  };

  const handleL2 = (k: string) => {
    setL2(k);
    setL3(null);
  };

  const handleL3 = (k: string) => {
    setL3(k);
    if (l1 && l2) applyPick({ level1: l1, level2: l2, level3: k });
  };

  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-lg overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border-default)] px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            여행 지역
          </p>
          <p className="text-[12px] font-medium text-[var(--text-strong)] truncate">
            {breadcrumb ? breadcrumb.replace(/ · /g, " > ") : "광역 → 구 → 동네 순으로 선택"}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              setL1(null);
              setL2(null);
              setL3(null);
              onApply("");
            }}
            className="rounded-lg px-2 py-1.5 text-[11px] font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-surface-subtle)]"
          >
            초기화
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] hover:bg-[var(--brand-primary-soft)]"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex divide-x divide-[var(--border-default)] min-h-[200px] max-h-[240px]">
        <div className="flex-1 min-w-0 overflow-y-auto overscroll-contain p-2">
          {LEVEL1_OPTIONS.map((k) => (
            <button key={k} type="button" className={colBtn(l1 === k)} onClick={() => handleL1(k)}>
              {k}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-0 overflow-y-auto overscroll-contain p-2">
          {!l1 ? (
            <p className="text-[12px] text-[var(--text-muted)] px-2 py-4">왼쪽에서 광역을 고르세요</p>
          ) : (
            l2List.map((k) => (
              <button key={k} type="button" className={colBtn(l2 === k)} onClick={() => handleL2(k)}>
                {k}
              </button>
            ))
          )}
        </div>
        <div className="flex-1 min-w-0 overflow-y-auto overscroll-contain p-2">
          {!l2 ? (
            <p className="text-[12px] text-[var(--text-muted)] px-2 py-4">가운데에서 구역을 고르세요</p>
          ) : (
            l3List.map((k) => (
              <button key={k} type="button" className={colBtn(l3 === k)} onClick={() => handleL3(k)}>
                {k}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="space-y-2 border-t border-[var(--border-default)] px-3 py-2.5 bg-[var(--bg-page)]">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!l1 || !l2}
            onClick={() => l1 && l2 && applyPick({ level1: l1, level2: l2, level3: null })}
            className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-[12px] font-semibold text-[var(--text-on-brand)] disabled:opacity-40"
          >
            시·군·구만 확정
          </button>
          <p className="text-[10px] text-[var(--text-muted)]">동네는 오른쪽 열에서 고르면 바로 반영됩니다</p>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="목록에 없으면 직접 입력 (예: 대구 동성로)"
            className="flex-1 min-w-0 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2.5 py-2 text-[12px] text-[var(--text-strong)]"
          />
          <button
            type="button"
            disabled={!manual.trim()}
            onClick={() => {
              const t = manual.trim();
              if (t) onApply(t);
            }}
            className="shrink-0 rounded-lg bg-[var(--brand-trust-blue-soft)] px-3 py-2 text-[12px] font-semibold text-[var(--brand-trust-blue)] disabled:opacity-40"
          >
            적용
          </button>
        </div>
      </div>
    </div>
  );
}
