import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const heroPrimaryText =
  "text-[10px] leading-snug text-white/52 sm:text-[11px]";
const heroSecondaryText =
  "text-[10px] leading-snug text-white/38 sm:text-[11px]";

/**
 * 홈 히어로 — 다크 배경 위 스코프 안내(주) + 제외/확인(부).
 * `secondaryFromSm`: 모바일 세로 절약을 위해 부 노트를 sm 이상에서만 시각 표시(주만 항상 노출).
 */
export function HomeAuxiliaryNoteHero({
  primary,
  secondary,
  secondaryFromSm = true,
  className,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  secondaryFromSm?: boolean;
  className?: string;
}) {
  const showSecondary = secondary != null && secondary !== "";
  return (
    <div className={cn("max-w-md space-y-1", className)} role="note">
      <p className={heroPrimaryText}>{primary}</p>
      {showSecondary ? (
        <p className={cn(heroSecondaryText, secondaryFromSm && "hidden sm:block")}>{secondary}</p>
      ) : null}
    </div>
  );
}

/**
 * 퀵스타트 등 라이트 섹션 — 프로세스·흐름 보조 노트(왼쪽 액센트 보더).
 */
export function HomeAuxiliaryNoteSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-muted-foreground mt-6 max-w-3xl border-border/50 border-l-2 pl-3 text-xs leading-relaxed sm:mt-7 sm:pl-3.5 sm:text-[13px]",
        className,
      )}
      role="note"
    >
      {children}
    </p>
  );
}
