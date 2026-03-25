"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const SWITCH_LOCALES = ["en", "ko", "ja"] as const;

export function LanguageSwitcher({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "onDark";
}) {
  const t = useTranslations("LanguageSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const onDark = variant === "onDark";

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-[var(--radius-md)] border p-1 transition-[border-color,background-color] duration-300 ease-out",
        onDark
          ? "border-white/20 bg-white/10 backdrop-blur-sm"
          : "border-border/70 bg-[color-mix(in_srgb,var(--brand-primary-soft)_45%,var(--bg-surface-subtle))]",
        className,
      )}
      role="group"
      aria-label={t("label")}
    >
      {SWITCH_LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => router.replace(pathname, { locale: code })}
          className={cn(
            "min-h-10 min-w-10 rounded-[var(--radius-sm)] px-3 text-xs font-semibold tracking-wide transition-[color,background-color,box-shadow] duration-200 sm:min-w-[2.75rem]",
            locale === code
              ? onDark
                ? "bg-white text-[var(--brand-primary)] shadow-sm ring-1 ring-white/40"
                : "bg-[var(--brand-primary)] text-[var(--text-on-brand)] shadow-sm ring-1 ring-[color-mix(in_srgb,var(--brand-primary)_40%,#fff)]"
              : onDark
                ? "text-white/75 hover:bg-white/12 hover:text-white"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
          )}
        >
          {t(code)}
        </button>
      ))}
    </div>
  );
}
