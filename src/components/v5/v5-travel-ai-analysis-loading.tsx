"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { Bot, Compass } from "lucide-react";

/** 2~3초 간격으로 순차 노출 (ms) */
const LINE_INTERVAL_MS = 2600;

export const TRAVEL_AI_ANALYSIS_LINES = [
  "✓ 사용자 여행 성향 및 출발지 분석 완료...",
  "✓ 설정된 지역의 교통 데이터 및 최적 동선 계산 중...",
  "✓ 한국관광공사 API에서 핫플레이스 및 이미지 매칭 중...",
  "✓ 로컬 가이드의 숨은 꿀팁 조합하는 중...",
  "🚀 분석 완료! 맞춤형 여정 지도를 그리는 중입니다.",
] as const;

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

export type V5TravelAiAnalysisLoadingOverlayProps = {
  /** false이면 마운트하지 않고 타이머도 돌지 않음 */
  open: boolean;
  className?: string;
};

/**
 * 여행 AI 응답·동선·지도 경로 대기용 오버레이.
 * `open`이 false가 되면 페이드아웃 없이 제거되므로, 부모에서 조건부 렌더링해도 됩니다.
 */
export function V5TravelAiAnalysisLoadingOverlay({
  open,
  className = "",
}: V5TravelAiAnalysisLoadingOverlayProps) {
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

  if (!open) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="AI가 여행 정보를 분석하는 중"
      className={`flex cursor-wait flex-col items-center bg-[var(--bg-page)]/88 px-5 py-10 backdrop-blur-md motion-reduce:backdrop-blur-sm ${className}`}
    >
      <div className="flex w-full max-w-md flex-col items-center">
        {/* 아바타 + 회전 서클 + 나침반 */}
        <div className="relative flex h-[7.5rem] w-[7.5rem] shrink-0 items-center justify-center">
          <div
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-[var(--brand-trust-blue)]/35 shadow-[0_0_28px_rgba(47,79,143,0.22)] motion-safe:animate-[spin_4.5s_linear_infinite] motion-reduce:animate-none"
            style={{ borderStyle: "solid" }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-[10px] rounded-full border border-dashed border-[var(--brand-trust-blue)]/25 motion-safe:animate-[spin_7s_linear_infinite] motion-reduce:animate-none motion-safe:[animation-direction:reverse]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-[22px] rounded-full bg-[var(--brand-trust-blue)]/8 motion-safe:animate-pulse motion-reduce:animate-none"
            aria-hidden
          />

          <div className="relative z-10 flex flex-col items-center gap-1">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-[var(--brand-trust-blue)] shadow-md ring-4 ring-[var(--bg-elevated)] motion-safe:animate-pulse motion-reduce:animate-none">
              <Bot className="h-5 w-5 text-white" strokeWidth={2} aria-hidden />
            </div>
            <Compass
              className="h-7 w-7 text-[var(--brand-trust-blue)] opacity-90 motion-safe:animate-[spin_12s_linear_infinite] motion-reduce:animate-none"
              strokeWidth={2}
              aria-hidden
            />
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          AI 여행 분석기
        </p>

        <div className="mt-4 w-full max-w-[min(100%,26rem)] space-y-1 rounded-2xl border border-[var(--border-default)]/80 bg-[var(--bg-elevated)]/75 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:bg-[var(--bg-elevated)]/50">
          {TRAVEL_AI_ANALYSIS_LINES.map((line, i) => (
            <AnalysisLine key={line} text={line} active={i < visibleCount} />
          ))}
        </div>
      </div>
    </div>
  );
}
