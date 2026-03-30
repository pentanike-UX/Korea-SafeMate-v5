import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PostDetailStickyAsideVariant = "default" | "route";

/**
 * Post detail right column: sticky from tablet/desktop so guardian + trust note stay in view.
 * - `default`: 헤더(`h-14` / `sm:h-16`) + 소간격.
 * - `route`: 상단 고정 루트 스팟 네비(`top-14`/`16` + ~52px) 아래로 카드가 내려가 보이도록 top을 더 크게.
 */
export function PostDetailStickyAside({
  children,
  className,
  variant = "default",
  id,
}: {
  children: ReactNode;
  className?: string;
  variant?: PostDetailStickyAsideVariant;
  id?: string;
}) {
  const topClass = variant === "route" ? "md:top-36 lg:top-[9.5rem]" : "md:top-20";

  return (
    <div
      id={id}
      className={cn(
        "md:sticky md:z-0 md:self-start",
        topClass,
        "lg:col-span-4",
        className,
      )}
    >
      <div className="space-y-5 md:space-y-6">{children}</div>
    </div>
  );
}
