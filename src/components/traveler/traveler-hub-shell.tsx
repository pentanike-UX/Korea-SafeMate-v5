"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Bookmark, Heart, LayoutDashboard, MessageCircle, Plane } from "lucide-react";

const NAV: { href: string; labelKey: "navOverview" | "navRequests" | "navSavedGuardians" | "navSavedPosts" | "navMessages"; Icon: typeof Plane }[] = [
  { href: "/traveler", labelKey: "navOverview", Icon: LayoutDashboard },
  { href: "/traveler/requests", labelKey: "navRequests", Icon: Plane },
  { href: "/traveler/saved-guardians", labelKey: "navSavedGuardians", Icon: Heart },
  { href: "/traveler/saved-posts", labelKey: "navSavedPosts", Icon: Bookmark },
  { href: "/traveler/messages", labelKey: "navMessages", Icon: MessageCircle },
];

export function TravelerHubShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations("TravelerHub");

  return (
    <div className="bg-[var(--bg-page)] min-h-screen">
      <div className="border-border/60 border-b bg-card/95 backdrop-blur-sm">
        <div className="page-container py-10 sm:py-12 md:py-14">
          <p className="text-[var(--brand-trust-blue)] text-[11px] font-semibold tracking-[0.18em] uppercase">42 Guardians</p>
          <h1 className="text-text-strong mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{t("hubTitle")}</h1>
          <p className="text-muted-foreground mt-3 max-w-xl text-[15px] leading-relaxed sm:text-base">{t("hubLead")}</p>
        </div>
      </div>

      <div className="page-container flex flex-col gap-10 py-8 sm:py-10 md:gap-12 lg:flex-row lg:gap-14">
        <nav
          className="border-border/60 lg:w-60 lg:shrink-0 lg:border-r lg:pr-8"
          aria-label={t("navAria")}
        >
          <ul className="flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] lg:flex-col lg:gap-1.5 lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
            {NAV.map(({ href, labelKey, Icon }) => {
              const active = pathname === href || (href !== "/traveler" && pathname.startsWith(href));
              return (
                <li key={href} className="shrink-0 lg:shrink">
                  <Link
                    href={href}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] px-4 py-3 text-[15px] font-medium transition-colors lg:min-h-12 lg:py-3.5",
                      active
                        ? "bg-[var(--brand-trust-blue-soft)] text-[var(--brand-trust-blue)] ring-1 ring-[color-mix(in_srgb,var(--brand-trust-blue)_22%,transparent)]"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="size-5 shrink-0 opacity-90" strokeWidth={1.75} aria-hidden />
                    {t(labelKey)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="min-w-0 flex-1 pb-24 lg:pb-12">{children}</div>
      </div>
    </div>
  );
}
