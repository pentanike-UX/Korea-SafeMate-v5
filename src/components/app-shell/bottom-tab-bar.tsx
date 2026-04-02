"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { MessageCircle } from "lucide-react";

export function BottomTabBar() {
  const pathname = usePathname();
  const t = useTranslations("V4.bottomNav");

  const active = pathname === "/chat" || pathname.endsWith("/chat");

  return (
    <nav
      className={cn(
        "border-border/55 bg-[color-mix(in_srgb,var(--bg-surface)_96%,transparent)] fixed right-0 bottom-0 left-0 z-50 flex border-t pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_40px_rgba(15,23,42,0.05)] supports-[backdrop-filter]:backdrop-blur-xl lg:hidden",
      )}
      aria-label={t("aria")}
    >
      <Link
        href="/chat"
        className={cn(
          "text-muted-foreground flex min-h-[var(--touch-target)] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors duration-200",
          active && "text-[var(--brand-trust-blue)]",
        )}
      >
        <MessageCircle className={cn("size-5", active && "text-[var(--brand-trust-blue)]")} strokeWidth={1.75} aria-hidden />
        <span className="max-w-[4.5rem] truncate">{t("chatOnly")}</span>
      </Link>
    </nav>
  );
}
