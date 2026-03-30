"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";
import { Moon, Sun } from "lucide-react";

/**
 * Footer-only: reads as a real switch (not a lone icon) on dark surfaces.
 */
export function FooterThemeSwitch({ className }: { className?: string }) {
  const t = useTranslations("Header");
  const tFooter = useTranslations("Footer");
  const { resolved, mounted, toggleTheme } = useTheme();
  const dark = resolved === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      disabled={!mounted}
      aria-label={dark ? t("themeSwitchToLight") : t("themeSwitchToDark")}
      onClick={toggleTheme}
      className={cn(
        "relative inline-flex h-10 min-h-10 w-[5.75rem] shrink-0 items-center rounded-[var(--radius-md)] border border-white/22 bg-white/[0.07] px-1 shadow-inner outline-none transition-colors sm:w-[6rem]",
        "focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        "disabled:opacity-60",
        className,
      )}
    >
      <span className="pointer-events-none flex w-full items-center justify-between px-1.5">
        <Sun
          className={cn("size-[1.125rem] transition-colors", dark ? "text-amber-200/95" : "text-amber-200")}
          strokeWidth={2.35}
          aria-hidden
        />
        <Moon
          className={cn("size-[1.125rem] transition-colors", dark ? "text-sky-50" : "text-sky-200")}
          strokeWidth={2.35}
          aria-hidden
        />
      </span>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-0.5 bottom-0.5 w-[1.875rem] rounded-[calc(var(--radius-md)-4px)] bg-white/95 shadow-md ring-1 ring-black/15 transition-[left] duration-200 ease-out",
          dark ? "left-[calc(100%-2.125rem)]" : "left-1",
        )}
      />
      <span className="sr-only">{dark ? tFooter("themeDark") : tFooter("themeLight")}</span>
    </button>
  );
}
