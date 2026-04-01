"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function PanelFooterUtility({
  onAccount,
  onLanguage,
  onHelp,
  onInfo,
  className,
}: {
  onAccount: () => void;
  onLanguage: () => void;
  onHelp: () => void;
  onInfo: () => void;
  className?: string;
}) {
  const t = useTranslations("V4.workspace.utility");

  const btn =
    "text-muted-foreground hover:text-[var(--text-strong)] rounded-[12px] px-2.5 py-2 text-[11px] font-medium transition-colors";

  return (
    <footer
      className={cn(
        "border-border/45 bg-[color-mix(in_srgb,var(--bg-surface)_99%,transparent)] flex shrink-0 flex-wrap items-center justify-center gap-1 border-t px-3 py-2.5",
        className,
      )}
    >
      <button type="button" className={btn} onClick={onAccount}>
        {t("account")}
      </button>
      <span className="text-border text-[10px]" aria-hidden>
        ·
      </span>
      <button type="button" className={btn} onClick={onLanguage}>
        {t("language")}
      </button>
      <span className="text-border text-[10px]" aria-hidden>
        ·
      </span>
      <button type="button" className={btn} onClick={onHelp}>
        {t("help")}
      </button>
      <span className="text-border text-[10px]" aria-hidden>
        ·
      </span>
      <button type="button" className={btn} onClick={onInfo}>
        {t("info")}
      </button>
    </footer>
  );
}
