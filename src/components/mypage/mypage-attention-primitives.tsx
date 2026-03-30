"use client";

import {
  attentionCountAccessibleLabel,
  formatAttentionCountForDisplay,
} from "@/lib/mypage/attention-badge-display";
import { cn } from "@/lib/utils";

/** LNB·세그먼트용 숫자 배지 (0이면 렌더 없음) */
export function MypageMenuCountBadge({ count, ariaLabel }: { count: number; ariaLabel: string }) {
  if (count < 1) return null;
  const shown = formatAttentionCountForDisplay(count);
  return (
    <span
      role="status"
      aria-label={attentionCountAccessibleLabel(ariaLabel, count)}
      className={cn(
        "bg-destructive text-destructive-foreground inline-flex min-w-[1.125rem] shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums leading-none",
      )}
    >
      {shown}
    </span>
  );
}

/** 헤더 아바타·이름 옆 전역 알림 (숫자 없음) */
export function HeaderAttentionDot({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "bg-destructive ring-background inline-block size-2 shrink-0 rounded-full ring-2",
        className,
      )}
      aria-hidden
    />
  );
}

/** 카드/섹션 제목 옆 블록 단위 배지 */
export function BlockAttentionBadge({ count, ariaLabel }: { count: number; ariaLabel: string }) {
  if (count < 1) return null;
  const shown = formatAttentionCountForDisplay(count);
  return (
    <span
      role="status"
      aria-label={attentionCountAccessibleLabel(ariaLabel, count)}
      className="bg-destructive/15 text-destructive inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums"
    >
      {shown}
    </span>
  );
}
