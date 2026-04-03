"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Compass } from "lucide-react";

/** 2~3초 간격으로 순차 노출 (ms) */
const LINE_INTERVAL_MS = 2600;

/** 1단계: 입력 → 칩 정리(gather). 동선·지도 작업이 아님을 분명히 함 */
export const TRAVEL_AI_GATHER_LINES = [
  "말씀해 주신 내용을 읽고 있어요…",
  "지역·일정·취향을 여행 조건 칩으로 옮기는 중이에요.",
  "정리가 끝나면 값이 어떻게 매칭됐는지 한눈에 확인하실 수 있어요.",
  "칩을 검토한 뒤 「이 정보로 동선 짜기」에서 실제 코스를 만듭니다.",
] as const;

/** 2단계: 확정 조건 → 동선·스팟·지도 (plan / 경로 그리기) */
export const TRAVEL_AI_PLAN_LINES = [
  "확정하신 조건으로 로컬 동선을 구성하는 중이에요…",
  "스팟 순서와 이동 방법·소요 시간을 잡고 있어요.",
  "지도에 보여 드릴 경로와 장소 정보를 준비하고 있어요.",
  "곧 타임라인과 상세 스팟을 확인하실 수 있어요.",
] as const;

/** @deprecated 호환용 — plan 단계 문구와 동일 */
export const TRAVEL_AI_ANALYSIS_LINES = TRAVEL_AI_PLAN_LINES;

function useAnalysisLineProgress(
  open: boolean,
  lineCount: number,
  /** gather↔plan 등 단계가 바뀌면 진행 줄을 처음부터 다시 */
  resetKey: string,
) {
  const [visibleCount, setVisibleCount] = useState(1);

  useLayoutEffect(() => {
    if (open) setVisibleCount(1);
    else setVisibleCount(0);
  }, [open, resetKey]);

  useEffect(() => {
    if (!open) return;

    setVisibleCount(1);
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i < lineCount; i++) {
      timers.push(
        setTimeout(() => {
          setVisibleCount((c) => Math.max(c, i + 1));
        }, LINE_INTERVAL_MS * i),
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [open, lineCount, resetKey]);

  return visibleCount;
}

/** 채팅 아바타와 동일: 일렉트릭 블루 + 흰색 진행 링 + 흰색 나침반(spin) */
function CompassLoadingMark({
  size = "sm",
  className = "",
}: {
  size?: "sm" | "lg";
  className?: string;
}) {
  const outer =
    size === "lg" ? "h-[4.5rem] w-[4.5rem]" : "h-7 w-7";
  const icon =
    size === "lg" ? "h-9 w-9" : "h-3.5 w-3.5";

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center rounded-full bg-[#0891ff] shadow-sm ring-1 ring-white/25 ${outer} ${className}`}
      aria-hidden
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 40 40"
        fill="none"
      >
        <g transform="rotate(-90 20 20)">
          <circle
            className="v5-compass-stroke-ring"
            cx="20"
            cy="20"
            r="15"
            fill="none"
            stroke="white"
            strokeWidth={size === "lg" ? 3 : 2.5}
            strokeLinecap="round"
          />
        </g>
      </svg>
      <Compass
        className={`relative z-10 text-white motion-safe:animate-spin motion-reduce:animate-none ${icon}`}
        strokeWidth={size === "lg" ? 2.25 : 2.5}
        aria-hidden
      />
    </div>
  );
}

function AnalysisLine({ text, active }: { text: string; active: boolean }) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!active) return;
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [active]);

  if (!active) return null;

  return (
    <p
      className={`border-l-2 border-[var(--brand-trust-blue)]/45 pl-3 py-1.5 text-left text-[12px] leading-relaxed text-[var(--text-secondary)] transition-all duration-700 ease-out motion-reduce:transition-none md:text-[13px] ${
        entered
          ? "translate-y-0 opacity-100"
          : "translate-y-1.5 opacity-0"
      }`}
    >
      {text}
    </p>
  );
}

function AnalysisLinesInner({
  lines,
  visibleCount,
}: {
  lines: readonly string[];
  visibleCount: number;
}) {
  return (
    <>
      {lines.map((line, i) => (
        <AnalysisLine key={line} text={line} active={i < visibleCount} />
      ))}
    </>
  );
}

export type TravelAiLoadingPhase = "gather" | "plan";

export type V5TravelAiAnalysisLoadingOverlayProps = {
  open: boolean;
  className?: string;
  /** `chat-row`: 어시스턴트 말풍선 열 정렬 / `panel`: 지도 등 전체 패널 오버레이 */
  variant?: "chat-row" | "panel";
  /**
   * gather: 조건 입력 직후 — 칩으로 정리하는 단계(동선·지도 아님).
   * plan: 「이 정보로 동선 짜기」 이후 — 스팟·동선·지도 구성.
   */
  phase?: TravelAiLoadingPhase;
};

/**
 * 여행 AI 대기 UI.
 * - gather: 입력을 칩으로 구조화하는 동안(맵/동선 오해 방지).
 * - plan: 동선·스팟·지도 로딩.
 */
export function V5TravelAiAnalysisLoadingOverlay({
  open,
  className = "",
  variant = "panel",
  phase = "plan",
}: V5TravelAiAnalysisLoadingOverlayProps) {
  const lines = useMemo(
    () => (phase === "gather" ? TRAVEL_AI_GATHER_LINES : TRAVEL_AI_PLAN_LINES),
    [phase],
  );
  const visibleCount = useAnalysisLineProgress(open, lines.length, phase);

  const title =
    phase === "gather" ? "여행 조건 정리 중" : "동선·지도 구성 중";
  const ariaLabel =
    phase === "gather"
      ? "입력하신 내용을 여행 조건 칩으로 정리하는 중"
      : "확정 조건으로 동선과 지도를 구성하는 중";

  if (!open) return null;

  if (variant === "chat-row") {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={ariaLabel}
        className={`flex items-end gap-3 ${className}`}
      >
        <CompassLoadingMark size="sm" />
        <div className="min-w-0 flex-1 space-y-1 rounded-2xl rounded-bl-sm border border-[var(--border-default)]/80 bg-[var(--bg-elevated)]/95 px-3.5 py-3 shadow-[0_1px_6px_rgba(20,20,20,0.05)] dark:bg-[var(--bg-elevated)]/90">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            {title}
          </p>
          <div className="mt-1 space-y-0.5">
            <AnalysisLinesInner lines={lines} visibleCount={visibleCount} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={ariaLabel}
      className={`flex cursor-wait flex-col items-center bg-[var(--bg-page)]/88 px-5 py-10 backdrop-blur-md motion-reduce:backdrop-blur-sm ${className}`}
    >
      <div className="flex w-full max-w-md flex-col items-center">
        <CompassLoadingMark size="lg" />

        <p className="mt-6 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          {title}
        </p>

        <div className="mt-4 w-full max-w-[min(100%,26rem)] space-y-1 rounded-2xl border border-[var(--border-default)]/80 bg-[var(--bg-elevated)]/75 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:bg-[var(--bg-elevated)]/50">
          <AnalysisLinesInner lines={lines} visibleCount={visibleCount} />
        </div>
      </div>
    </div>
  );
}
