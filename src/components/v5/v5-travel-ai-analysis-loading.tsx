"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { Compass } from "lucide-react";

/** 2~3초 간격으로 순차 노출 (ms) */
const LINE_INTERVAL_MS = 2600;

export const TRAVEL_AI_ANALYSIS_LINES = [
  "✓ 여행 지역·일정 맥락 분석 완료...",
  "✓ 설정된 지역의 교통 데이터 및 최적 동선 계산 중...",
  "✓ 한국관광공사 API에서 핫플레이스 및 이미지 매칭 중...",
  "✓ 로컬 가이드의 숨은 꿀팁 조합하는 중...",
  "🚀 분석 완료! 맞춤형 여정 지도를 그리는 중입니다.",
] as const;

function useAnalysisLineProgress(open: boolean) {
  const [visibleCount, setVisibleCount] = useState(1);

  useLayoutEffect(() => {
    if (open) setVisibleCount(1);
    else setVisibleCount(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    setVisibleCount(1);
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i < TRAVEL_AI_ANALYSIS_LINES.length; i++) {
      timers.push(
        setTimeout(() => {
          setVisibleCount((c) => Math.max(c, i + 1));
        }, LINE_INTERVAL_MS * i),
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [open]);

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

function AnalysisLinesInner({ visibleCount }: { visibleCount: number }) {
  return (
    <>
      {TRAVEL_AI_ANALYSIS_LINES.map((line, i) => (
        <AnalysisLine key={line} text={line} active={i < visibleCount} />
      ))}
    </>
  );
}

export type V5TravelAiAnalysisLoadingOverlayProps = {
  open: boolean;
  className?: string;
  /** `chat-row`: 어시스턴트 말풍선 열 정렬 / `panel`: 지도 등 전체 패널 오버레이 */
  variant?: "chat-row" | "panel";
};

/**
 * 여행 AI 응답·동선·지도 경로 대기 UI.
 * - `chat-row`: 채팅 심볼(#0891ff) 위치에 맞춘 한 줄 레이아웃
 * - `panel`: 반투명 배경 + 중앙 콘텐츠 (지도 모달 등)
 */
export function V5TravelAiAnalysisLoadingOverlay({
  open,
  className = "",
  variant = "panel",
}: V5TravelAiAnalysisLoadingOverlayProps) {
  const visibleCount = useAnalysisLineProgress(open);

  if (!open) return null;

  if (variant === "chat-row") {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="AI가 여행 정보를 분석하는 중"
        className={`flex items-end gap-3 ${className}`}
      >
        <CompassLoadingMark size="sm" />
        <div className="min-w-0 flex-1 space-y-1 rounded-2xl rounded-bl-sm border border-[var(--border-default)]/80 bg-[var(--bg-elevated)]/95 px-3.5 py-3 shadow-[0_1px_6px_rgba(20,20,20,0.05)] dark:bg-[var(--bg-elevated)]/90">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            AI 여행 분석기
          </p>
          <div className="mt-1 space-y-0.5">
            <AnalysisLinesInner visibleCount={visibleCount} />
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
      aria-label="AI가 여행 정보를 분석하는 중"
      className={`flex cursor-wait flex-col items-center bg-[var(--bg-page)]/88 px-5 py-10 backdrop-blur-md motion-reduce:backdrop-blur-sm ${className}`}
    >
      <div className="flex w-full max-w-md flex-col items-center">
        <CompassLoadingMark size="lg" />

        <p className="mt-6 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          AI 여행 분석기
        </p>

        <div className="mt-4 w-full max-w-[min(100%,26rem)] space-y-1 rounded-2xl border border-[var(--border-default)]/80 bg-[var(--bg-elevated)]/75 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:bg-[var(--bg-elevated)]/50">
          <AnalysisLinesInner visibleCount={visibleCount} />
        </div>
      </div>
    </div>
  );
}
