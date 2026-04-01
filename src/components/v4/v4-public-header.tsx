"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { BRAND } from "@/lib/constants";
import { HeaderAccountMenu } from "@/components/auth/header-account-menu";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useAuthUser } from "@/hooks/use-auth-user";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Menu, Search } from "lucide-react";

const DESKTOP_NAV: { href: string; msgKey: "explore" | "planner" | "guardians" | "stories" | "safety" }[] = [
  { href: "/explore/routes", msgKey: "explore" },
  { href: "/planner", msgKey: "planner" },
  { href: "/guardians", msgKey: "guardians" },
  { href: "/stories", msgKey: "stories" },
  { href: "/safety", msgKey: "safety" },
];

function navActive(href: string, pathname: string) {
  if (href === "/explore/routes") return pathname.startsWith("/explore");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function V4HeaderNavRow({
  pathname,
  t,
  mobile = false,
}: {
  pathname: string;
  t: (key: "explore" | "planner" | "guardians" | "stories" | "safety") => string;
  mobile?: boolean;
}) {
  return (
    <nav className={cn("flex gap-0.5", mobile ? "flex-col" : "items-center")}>
      {DESKTOP_NAV.map((item) => {
        const active = navActive(item.href, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-[var(--radius-md)] text-sm font-medium transition-colors duration-200",
              mobile ? "min-h-12 px-3 py-3 text-base" : "px-3 py-2",
              active
                ? "bg-[var(--brand-trust-blue-soft)] text-[var(--brand-trust-blue)]"
                : "text-[var(--text-strong)]/80 hover:bg-[var(--brand-primary-soft)] hover:text-[var(--text-strong)]",
            )}
          >
            {t(item.msgKey)}
          </Link>
        );
      })}
    </nav>
  );
}

export function V4PublicHeader({ variant = "default" }: { variant?: "default" | "mapPrimary" }) {
  const pathname = usePathname();
  const user = useAuthUser();
  const t = useTranslations("V4.nav");
  const tHeader = useTranslations("Header");
  const [solid, setSolid] = useState(false);
  const mapPrimary = variant === "mapPrimary";

  useEffect(() => {
    if (mapPrimary) return;
    const onScroll = () => setSolid(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mapPrimary]);

  return (
    <header
      className={cn(
        "z-50 border-b transition-[background-color,backdrop-filter,box-shadow] duration-500 ease-out",
        mapPrimary
          ? "fixed top-0 right-0 left-0 border-[color-mix(in_srgb,var(--border-default)_65%,transparent)] bg-[color-mix(in_srgb,var(--bg-surface)_90%,transparent)] shadow-[0_12px_40px_rgba(15,23,42,0.05)] backdrop-blur-xl supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--bg-surface)_84%,transparent)]"
          : "sticky top-0",
        !mapPrimary &&
          (solid
            ? "border-[var(--border-default)] bg-[color-mix(in_srgb,var(--bg-surface)_92%,transparent)] shadow-[var(--shadow-sm)] backdrop-blur-xl supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--bg-surface)_86%,transparent)]"
            : "border-transparent bg-[color-mix(in_srgb,var(--bg-page)_78%,transparent)] backdrop-blur-md"),
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-[100rem] items-center gap-2 px-4 sm:gap-4 sm:px-6 lg:px-10",
          mapPrimary ? "h-12 min-h-12 sm:h-[3.25rem] sm:min-h-[3.25rem]" : "h-14 min-h-14 sm:h-16 sm:min-h-16",
        )}
      >
        <Link href="/" className="flex min-w-0 shrink items-center gap-2.5 rounded-xl active:opacity-90">
          <span className="bg-[var(--brand-primary)] flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-lg)] text-xs font-semibold tracking-tight text-[var(--text-on-brand)] shadow-[var(--shadow-sm)]">
            SM
          </span>
          <div className="min-w-0 leading-tight">
            <span className="text-[var(--text-strong)] block truncate text-sm font-semibold tracking-tight">{BRAND.name}</span>
            {!mapPrimary ? (
              <span className="text-muted-foreground hidden truncate text-[10px] font-medium sm:block">{BRAND.tagline}</span>
            ) : null}
          </div>
        </Link>

        <div className="hidden min-w-0 flex-1 justify-center lg:flex">
          <V4HeaderNavRow pathname={pathname} t={t} />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="text-[var(--text-strong)]/85 size-9 rounded-[var(--radius-md)]"
            aria-label={t("searchAria")}
          >
            <Link href="/search">
              <Search className="size-[1.15rem]" strokeWidth={1.75} />
            </Link>
          </Button>

          <div className="hidden sm:block">
            <LanguageSwitcher className="scale-95" />
          </div>

          {user === undefined ? (
            <div className="bg-muted/80 h-9 w-24 animate-pulse rounded-[var(--radius-md)]" aria-hidden />
          ) : user ? (
            <HeaderAccountMenu authUser={user} onDarkSurface={false} />
          ) : (
            <Button asChild variant="ghost" size="sm" className="text-[var(--text-strong)]/90 h-9 rounded-[var(--radius-md)] px-3 text-sm">
              <Link href="/login">{tHeader("logIn")}</Link>
            </Button>
          )}

          <Sheet>
            <SheetTrigger
              className="border-border/80 bg-card text-foreground inline-flex size-9 items-center justify-center rounded-[var(--radius-md)] border shadow-sm lg:hidden"
              aria-label={tHeader("openMenu")}
            >
              <Menu className="size-[1.2rem]" strokeWidth={1.75} />
            </SheetTrigger>
            <SheetContent side="right" className="flex w-[min(100%,22rem)] flex-col gap-4">
              <SheetHeader>
                <SheetTitle>{tHeader("menu")}</SheetTitle>
              </SheetHeader>
              <V4HeaderNavRow pathname={pathname} t={t} mobile />
              <div className="border-border/60 border-t pt-4">
                <p className="text-muted-foreground mb-2 text-xs font-medium">{t("language")}</p>
                <LanguageSwitcher />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
