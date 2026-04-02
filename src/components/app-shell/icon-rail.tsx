"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BRAND } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { CircleHelp, CircleUser, Compass, Home, Info } from "lucide-react";
import { RailItem } from "@/components/app-shell/rail-item";

const RAIL_W = "w-[72px]";

export function IconRail({
  pathname,
  onOpenHelp,
  onOpenInfo,
  onOpenLanguage,
  onOpenAccount,
}: {
  pathname: string;
  onOpenHelp: () => void;
  onOpenInfo: () => void;
  onOpenLanguage: () => void;
  onOpenAccount: () => void;
}) {
  const t = useTranslations("V4.workspace.rail");

  const chatActive = pathname === "/chat" || pathname.endsWith("/chat");

  return (
    <aside
      className={cn(
        RAIL_W,
        "border-border/60 bg-[color-mix(in_srgb,var(--bg-surface)_96%,transparent)] z-30 hidden shrink-0 flex-col border-r py-3 shadow-[4px_0_32px_rgba(15,23,42,0.04)] supports-[backdrop-filter]:backdrop-blur-md lg:flex",
      )}
      aria-label={t("aria")}
    >
      <div className="flex flex-col items-center px-2">
        <Link
          href="/chat"
          className="mb-5 flex size-11 items-center justify-center rounded-[14px] border border-white/[0.08] shadow-[var(--shadow-sm)] transition-transform hover:scale-[1.03] active:scale-[0.98]"
          style={{ backgroundColor: BRAND.logo.background }}
          title={BRAND.name}
        >
          <Compass
            className="size-[22px] shrink-0"
            style={{ color: BRAND.logo.electricBlue }}
            strokeWidth={2.35}
            aria-hidden
          />
          <span className="sr-only">{BRAND.name}</span>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col items-center gap-1.5 px-2" aria-label={t("mainNavAria")}>
        <RailItem href="/chat" label={t("home")} active={chatActive} title={t("home")}>
          <Home className="size-[22px] shrink-0" aria-hidden />
        </RailItem>
      </nav>

      <div className="mt-auto flex flex-col items-center gap-1.5 px-2 pb-1">
        <RailItem onClick={onOpenHelp} label={t("help")} title={t("help")}>
          <CircleHelp className="size-[20px] shrink-0" aria-hidden />
        </RailItem>
        <RailItem onClick={onOpenInfo} label={t("info")} title={t("info")}>
          <Info className="size-[20px] shrink-0" aria-hidden />
        </RailItem>
        <RailItem onClick={onOpenLanguage} label={t("language")} title={t("language")}>
          <span className="text-[11px] font-semibold tracking-tight" aria-hidden>
            Aa
          </span>
        </RailItem>
        <RailItem onClick={onOpenAccount} label={t("account")} title={t("account")}>
          <CircleUser className="size-[20px] shrink-0 opacity-80" aria-hidden />
        </RailItem>
      </div>
    </aside>
  );
}
