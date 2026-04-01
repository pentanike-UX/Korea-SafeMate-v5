"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const LINKS: { href: string; key: "routes" | "spots" | "neighborhoods" | "vibes" | "time" | "hidden" }[] = [
  { href: "/explore/routes", key: "routes" },
  { href: "/explore/spots", key: "spots" },
  { href: "/explore/neighborhoods", key: "neighborhoods" },
  { href: "/explore/vibes", key: "vibes" },
  { href: "/explore/time", key: "time" },
  { href: "/explore/hidden", key: "hidden" },
];

export function ExploreLocalNav() {
  const pathname = usePathname();
  const t = useTranslations("V4.exploreNav");

  return (
    <div className="border-border/50 bg-[var(--bg-surface-subtle)]/80 -mx-4 mb-8 border-y px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-0 lg:rounded-[var(--radius-card)] lg:border">
      <p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-widest uppercase">{t("label")}</p>
      <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {LINKS.map((l) => {
          const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-200",
                active
                  ? "bg-[var(--text-strong)] text-[var(--text-on-brand)]"
                  : "bg-card text-[var(--text-strong)]/75 ring-1 ring-[var(--border-default)] hover:bg-[var(--brand-primary-soft)]",
              )}
            >
              {t(l.key)}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
