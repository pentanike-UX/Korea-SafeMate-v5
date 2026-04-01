import type { ComponentProps } from "react";
import NextLink from "next/link";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { FooterPreferences } from "@/components/layout/footer-preferences";
import { BRAND } from "@/lib/constants";

export async function SiteFooter() {
  const tFooter = await getTranslations("Footer");
  const tBrand = await getTranslations("Brand");
  const tV4 = await getTranslations("V4.footer");

  type AppHref = ComponentProps<typeof Link>["href"];

  const product: { href: AppHref; label: string }[] = [
    { href: "/explore/routes", label: tV4("explore") },
    { href: "/planner", label: tV4("planner") },
    { href: "/stories", label: tV4("stories") },
    { href: "/safety", label: tV4("safety") },
    { href: "/cities/seoul", label: tV4("cities") },
  ];

  const company: { href: AppHref; label: string }[] = [
    { href: "/about", label: tV4("about") },
    { href: "/help", label: tV4("help") },
    { href: "/guardians/apply", label: tFooter("apply") },
    { href: "/about#terms" as AppHref, label: tFooter("termsLink") },
    { href: "/about#privacy" as AppHref, label: tFooter("privacyLink") },
  ];

  const linkClass =
    "text-muted-foreground hover:text-foreground inline-flex min-h-8 items-center rounded-[var(--radius-md)] py-0.5 text-[13px] font-medium transition-colors";

  return (
    <footer className="border-border/60 bg-[var(--bg-surface-subtle)] border-t pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-10">
      <div className="page-container py-12 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,14rem)] lg:gap-8">
          <section className="max-w-md">
            <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.22em] uppercase">{BRAND.name}</p>
            <p className="text-foreground mt-3 text-lg font-semibold tracking-tight">{tBrand("tagline")}</p>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{tV4("pitch")}</p>
          </section>

          <nav aria-label={tFooter("sitemapAria")}>
            <p className="text-muted-foreground mb-3 text-[10px] font-semibold tracking-widest uppercase">{tV4("product")}</p>
            <ul className="space-y-1">
              {product.map((item) => (
                <li key={`${item.href}`}>
                  <Link href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label={tFooter("operations")}>
            <p className="text-muted-foreground mb-3 text-[10px] font-semibold tracking-widest uppercase">{tV4("company")}</p>
            <ul className="space-y-1">
              {company.map((item) => (
                <li key={`${item.href}-${item.label}`}>
                  <Link href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lg:border-border/50 lg:pl-6">
            <p className="text-muted-foreground mb-3 text-[10px] font-semibold tracking-widest uppercase lg:sr-only">{tFooter("prefsAria")}</p>
            <FooterPreferences className="justify-start" />
            {process.env.NODE_ENV === "development" ? (
              <NextLink
                href="/admin/dashboard"
                className="text-muted-foreground hover:text-foreground mt-4 inline-flex h-9 items-center rounded-[var(--radius-md)] border border-dashed px-3 text-xs font-medium"
              >
                {tFooter("adminConsoleLink")}
              </NextLink>
            ) : null}
          </div>
        </div>

        <div className="border-border/50 mt-10 flex flex-col gap-1 border-t pt-6 text-[11px] text-[var(--text-secondary)] sm:flex-row sm:items-center sm:justify-between sm:text-xs">
          <p>{tFooter("copyright", { year: new Date().getFullYear() })}</p>
          <p>{tFooter("hqLine")}</p>
        </div>
      </div>
    </footer>
  );
}
