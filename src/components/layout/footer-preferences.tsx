"use client";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

export function FooterPreferences({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3 sm:gap-4", className)}>
      <ThemeToggle variant="default" />
      <LanguageSwitcher className="w-fit" variant="default" />
    </div>
  );
}
