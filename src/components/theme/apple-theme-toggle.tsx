"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/**
 * iOS 설정 스타일의 라이트/다크 세그먼트 컨트롤.
 */
export function AppleThemeToggle({ className }: Props) {
  const t = useTranslations("Header");
  const { resolved, mounted, setTheme } = useTheme();
  const isDark = resolved === "dark";

  return (
    <div
      className={cn(
        "relative inline-flex h-[30px] w-[7.25rem] shrink-0 rounded-full p-[3px]",
        "bg-black/[0.06] ring-1 ring-inset ring-black/[0.06]",
        "dark:bg-white/[0.1] dark:ring-white/[0.08]",
        className,
      )}
      role="group"
      aria-label={t("themeAppearanceLabel")}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-[3px] top-[3px] bottom-[3px] w-[calc(50%-4.5px)] rounded-full",
          "bg-[var(--bg-surface)] shadow-[0_1px_2px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)]",
          "ring-1 ring-black/[0.04]",
          "dark:bg-zinc-600 dark:shadow-[0_1px_3px_rgba(0,0,0,0.45)] dark:ring-white/[0.12]",
          "transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]",
          !mounted && "opacity-0",
          isDark ? "translate-x-[calc(100%+3px)]" : "translate-x-0",
        )}
      />
      <div className="relative z-10 grid h-full w-full grid-cols-2">
        <button
          type="button"
          className={cn(
            "rounded-full text-[11px] font-semibold tracking-tight transition-colors duration-150",
            !isDark ? "text-[var(--text-strong)]" : "text-[var(--text-muted)]",
          )}
          aria-pressed={mounted ? !isDark : undefined}
          onClick={() => setTheme("light")}
        >
          {t("themeLightShort")}
        </button>
        <button
          type="button"
          className={cn(
            "rounded-full text-[11px] font-semibold tracking-tight transition-colors duration-150",
            isDark ? "text-[var(--text-strong)]" : "text-[var(--text-muted)]",
          )}
          aria-pressed={mounted ? isDark : undefined}
          onClick={() => setTheme("dark")}
        >
          {t("themeDarkShort")}
        </button>
      </div>
    </div>
  );
}
