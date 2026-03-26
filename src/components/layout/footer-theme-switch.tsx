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
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-[11px] font-semibold tracking-wide text-white/55 uppercase">{tFooter("themeLabel")}</span>
      <button
        type="button"
        role="switch"
        aria-checked={dark}
        disabled={!mounted}
        aria-label={dark ? t("themeSwitchToLight") : t("themeSwitchToDark")}
        onClick={toggleTheme}
        className={cn(
          "relative inline-flex h-10 w-[5.75rem] shrink-0 items-center rounded-full border border-white/25 bg-black/25 px-1 shadow-inner outline-none transition-colors",
          "focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
          "disabled:opacity-60",
        )}
      >
        <span className="pointer-events-none flex w-full items-center justify-between px-1.5">
          <Sun
            className={cn("size-3.5 transition-opacity", dark ? "text-white/35" : "text-amber-200/90")}
            strokeWidth={1.75}
            aria-hidden
          />
          <Moon
            className={cn("size-3.5 transition-opacity", dark ? "text-sky-100/90" : "text-white/35")}
            strokeWidth={1.75}
            aria-hidden
          />
        </span>
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-1 bottom-1 w-8 rounded-full bg-white/92 shadow-md ring-1 ring-black/10 transition-[left] duration-200 ease-out",
            dark ? "left-[calc(100%-2.25rem)]" : "left-1",
          )}
        />
        <span className="sr-only">{dark ? tFooter("themeDark") : tFooter("themeLight")}</span>
      </button>
    </div>
  );
}
