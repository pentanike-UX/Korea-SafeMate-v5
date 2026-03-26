"use client";

import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { FooterThemeSwitch } from "@/components/layout/footer-theme-switch";
import { cn } from "@/lib/utils";

export function FooterPreferences({ className }: { className?: string }) {
  const tHeader = useTranslations("Header");

  return (
    <div className={cn("flex flex-wrap items-center gap-5 sm:gap-6", className)}>
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold tracking-wide text-white/55 uppercase">{tHeader("languageLabel")}</span>
        <LanguageSwitcher className="w-fit shrink-0" variant="onDark" />
      </div>
      <FooterThemeSwitch />
    </div>
  );
}
