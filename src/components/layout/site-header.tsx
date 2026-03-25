"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { BRAND } from "@/lib/constants";
import { useHomeHeaderContrast } from "@/hooks/use-home-header-contrast";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Compass, FileText, Info, Menu, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV: { href: string; msgKey: "explore" | "posts" | "guardians" | "about"; Icon: LucideIcon }[] = [
  { href: "/explore", msgKey: "explore", Icon: Compass },
  { href: "/posts", msgKey: "posts", Icon: FileText },
  { href: "/guardians", msgKey: "guardians", Icon: Users },
  { href: "/about", msgKey: "about", Icon: Info },
];

function isNavActive(href: string, pathname: string) {
  if (href === "/guardians") return pathname === "/guardians" || pathname.startsWith("/guardians/");
  if (href === "/explore") return pathname === "/explore" || pathname.startsWith("/explore/");
  if (href === "/posts") return pathname === "/posts" || pathname.startsWith("/posts/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const tNav = useTranslations("Nav");
  const tHeader = useTranslations("Header");
  const tBrand = useTranslations("Brand");
  const isHome = pathname === "/";
  const heroContrast = useHomeHeaderContrast();
  const onDarkSurface = isHome && heroContrast === "dark";

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => {
    const glassHeaderNav = onDarkSurface && !mobile;
    return (
      <nav className={cn("flex gap-1", mobile ? "flex-col gap-1.5" : "items-center")}>
        {NAV.map((item) => {
          const active = isNavActive(item.href, pathname);
          const Icon = item.Icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex items-center gap-2.5 rounded-[var(--radius-md)] font-medium transition-colors duration-200",
                mobile ? "min-h-12 px-3 py-3 text-base" : "px-3 py-2.5 text-sm",
                glassHeaderNav
                  ? active
                    ? "bg-white/18 text-white ring-1 ring-white/30"
                    : "text-white/88 hover:bg-white/12 hover:text-white active:scale-[0.98]"
                  : active
                    ? "bg-[var(--brand-trust-blue-soft)] text-[var(--brand-trust-blue)] ring-1 ring-[color-mix(in_srgb,var(--brand-trust-blue)_28%,transparent)]"
                    : "text-[var(--text-strong)]/85 hover:bg-muted hover:text-[var(--text-strong)] active:scale-[0.98]",
              )}
            >
              <Icon
                className={cn("size-[1.125rem] shrink-0 opacity-90", mobile ? "size-5" : "")}
                strokeWidth={1.75}
                aria-hidden
              />
              {tNav(item.msgKey)}
            </Link>
          );
        })}
      </nav>
    );
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-300 ease-out",
        onDarkSurface
          ? "border-white/10 bg-black/24 shadow-none supports-[backdrop-filter]:bg-black/18"
          : "border-border/70 bg-background/93 shadow-[var(--shadow-sm)] supports-[backdrop-filter]:bg-background/86",
      )}
    >
      <div className="mx-auto flex min-h-14 h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:min-h-16 sm:gap-4 sm:px-6">
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2.5 rounded-lg active:opacity-90">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-primary)] text-sm font-bold text-[var(--text-on-brand)] shadow-sm ring-2 transition-[box-shadow] duration-300",
              onDarkSurface
                ? "ring-white/20"
                : "ring-[color-mix(in_srgb,var(--brand-trust-blue)_35%,transparent)] shadow-[0_1px_0_rgba(0,0,0,0.05)]",
            )}
          >
            42
          </span>
          <div className="min-w-0 leading-tight">
            <span
              className={cn(
                "block truncate text-sm font-semibold tracking-tight transition-colors duration-300",
                onDarkSurface ? "text-white" : "text-[var(--text-strong)]",
              )}
            >
              {BRAND.name}
            </span>
            <span
              className={cn(
                "hidden truncate text-[10px] font-medium transition-colors duration-300 sm:block",
                onDarkSurface ? "text-white/70" : "text-muted-foreground",
              )}
            >
              {tBrand("tagline")}
            </span>
          </div>
        </Link>

        <div className="hidden md:flex md:flex-1 md:justify-center">
          <NavLinks />
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ThemeToggle
            variant={onDarkSurface ? "onDarkSurface" : "default"}
            className="hidden sm:inline-flex"
          />
          <LanguageSwitcher className="hidden sm:flex transition-opacity duration-300" variant={onDarkSurface ? "onDark" : "default"} />
          <Button
            asChild
            variant="ghost"
            size="default"
            className={cn(
              "hidden px-3 sm:inline-flex transition-colors duration-200",
              onDarkSurface ? "text-white/90 hover:bg-white/10 hover:text-white" : "text-[var(--text-strong)]/85 hover:bg-muted hover:text-[var(--text-strong)]",
            )}
          >
            <Link href="/traveler">{tHeader("myJourney")}</Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="default"
            className={cn(
              "hidden px-3 sm:inline-flex transition-colors duration-200",
              onDarkSurface ? "text-white/90 hover:bg-white/10 hover:text-white" : "text-[var(--text-strong)]/85 hover:bg-muted hover:text-[var(--text-strong)]",
            )}
          >
            <Link href="/login">{tHeader("logIn")}</Link>
          </Button>
          <Button
            asChild
            size="default"
            className={cn(
              "hidden font-semibold sm:inline-flex",
              onDarkSurface
                ? "border-0 bg-white text-zinc-900 shadow-md shadow-black/20 hover:bg-white/92"
                : "shadow-sm",
            )}
          >
            <Link href="/guardians">{tHeader("findGuardians")}</Link>
          </Button>

          <Sheet>
            <SheetTrigger
              className={cn(
                "inline-flex size-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] border outline-none transition-colors duration-200 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:hidden",
                onDarkSurface
                  ? "border-white/28 bg-white/12 text-white hover:bg-white/18"
                  : "border-input bg-background text-[var(--text-strong)] hover:bg-muted",
              )}
              aria-label={tHeader("openMenu")}
            >
              <Menu className="size-[1.35rem]" strokeWidth={1.75} />
            </SheetTrigger>
            <SheetContent side="right" className="flex w-[min(100%,22rem)] flex-col gap-2">
              <SheetHeader className="pb-2">
                <SheetTitle>{tHeader("menu")}</SheetTitle>
              </SheetHeader>
              <div className="flex flex-1 flex-col gap-5 pb-2">
                <div className="flex flex-wrap items-center gap-3">
                  <ThemeToggle variant="default" className="sm:hidden" />
                  <LanguageSwitcher className="w-fit" />
                </div>
                <NavLinks mobile />
                <div className="border-border/60 flex flex-col gap-2.5 border-t pt-4">
                  <Button asChild className="w-full justify-center rounded-[var(--radius-md)]">
                    <Link href="/guardians">{tHeader("findGuardians")}</Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-center rounded-[var(--radius-md)]">
                    <Link href="/traveler">{tHeader("myJourney")}</Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-center rounded-[var(--radius-md)]">
                    <Link href="/login">{tHeader("signUp")}</Link>
                  </Button>
                  <Button asChild variant="secondary" className="w-full justify-center rounded-[var(--radius-md)]">
                    <Link href="/login/guardian">{tHeader("logIn")} · Guardian</Link>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
