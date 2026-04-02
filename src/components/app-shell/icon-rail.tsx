"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BRAND } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { CircleHelp, CircleUser, Compass, Heart, Home, Info, UserRound } from "lucide-react";
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

  const active = (p: string) => {
    if (p === "/chat") return pathname === "/chat" || pathname.endsWith("/chat");
    return pathname === p || pathname.startsWith(`${p}/`);
  };

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
          className="mb-5 flex size-11 items-center justify-center rounded-[14px] bg-[var(--brand-primary)] text-xs font-semibold tracking-tight text-[var(--text-on-brand)] shadow-[var(--shadow-sm)]"
          title={BRAND.name}
        >
          SM
        </Link>
      </div>

      <nav className="flex flex-1 flex-col items-center gap-1.5 px-2" aria-label={t("mainNavAria")}>
        <RailItem href="/chat" label={t("home")} active={active("/chat")} title={t("home")}>
          <Home className="size-[22px] shrink-0" aria-hidden />
        </RailItem>
        <RailItem href="/explore" label={t("explore")} active={active("/explore")} title={t("explore")}>
          <Compass className="size-[22px] shrink-0" aria-hidden />
        </RailItem>
        <RailItem href="/mypage/saved" label={t("saved")} active={pathname.startsWith("/mypage/saved")} title={t("saved")}>
          <Heart className="size-[22px] shrink-0" aria-hidden />
        </RailItem>
        <RailItem
          href="/mypage"
          label={t("my")}
          active={pathname.startsWith("/mypage") && !pathname.startsWith("/mypage/saved")}
          title={t("my")}
        >
          <UserRound className="size-[22px] shrink-0" aria-hidden />
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
