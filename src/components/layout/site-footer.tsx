import NextLink from "next/link";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BRAND } from "@/lib/constants";
import {
  Calendar,
  Compass,
  FileText,
  Info,
  LayoutDashboard,
  LogIn,
  Plane,
  Shield,
  UserPlus,
  Users,
} from "lucide-react";

export async function SiteFooter() {
  const tFooter = await getTranslations("Footer");
  const tBrand = await getTranslations("Brand");
  const tNav = await getTranslations("Nav");
  const tHeader = await getTranslations("Header");

  const product = [
    { href: "/explore" as const, label: tNav("explore"), Icon: Compass },
    { href: "/posts" as const, label: tNav("posts"), Icon: FileText },
    { href: "/guardians" as const, label: tNav("guardians"), Icon: Users },
    { href: "/traveler" as const, label: tHeader("myJourney"), Icon: Plane },
    { href: "/about" as const, label: tNav("about"), Icon: Info },
    { href: "/book" as const, label: tNav("book"), Icon: Calendar },
  ];

  const guardians: {
    href: string;
    label: string;
    Icon: typeof Users;
    native?: boolean;
  }[] = [
    { href: "/guardians", label: tNav("guardians"), Icon: Users },
    { href: "/guardians/apply", label: tFooter("apply"), Icon: UserPlus },
    { href: "/guardian/dashboard", label: tFooter("dashboard"), Icon: LayoutDashboard, native: true },
    { href: "/login/guardian", label: tFooter("guardianLogin"), Icon: LogIn },
  ];

  const ops: { href: string; label: string; Icon: typeof Shield; native?: boolean }[] = [
    { href: "/admin", label: tFooter("admin"), Icon: Shield, native: true },
    { href: "/login", label: tHeader("logIn"), Icon: LogIn },
  ];

  return (
    <footer className="border-t border-border/80 bg-[var(--bg-surface-subtle)]">
      <div className="page-container py-10 sm:py-12 md:py-14">
        <div className="flex flex-col gap-12 md:flex-row md:items-start md:justify-between md:gap-16">
          <div className="max-w-md">
            <p className="text-text-strong text-base font-semibold tracking-tight">{BRAND.name}</p>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed sm:text-[15px]">{tBrand("tagline")}</p>
            <p className="text-muted-foreground mt-6 text-xs leading-relaxed sm:text-sm">{tFooter("disclaimerShort")}</p>
          </div>
          <nav className="grid w-full gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12" aria-label="Footer">
            <div>
              <p className="text-text-strong mb-4 text-xs font-semibold tracking-wider uppercase">{tFooter("product")}</p>
              <ul className="flex flex-col gap-1">
                {product.map(({ href, label, Icon }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] py-1 pr-2 text-sm font-medium transition-colors"
                    >
                      <span className="text-[var(--brand-trust-blue)] flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--brand-trust-blue-soft)]">
                        <Icon className="size-[1.125rem]" strokeWidth={1.75} aria-hidden />
                      </span>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-text-strong mb-4 text-xs font-semibold tracking-wider uppercase">{tFooter("guardians")}</p>
              <ul className="flex flex-col gap-1">
                {guardians.map(({ href, label, Icon, native }) => {
                  const row = (
                    <>
                      <span className="text-[var(--brand-trust-blue)] flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--brand-trust-blue-soft)]">
                        <Icon className="size-[1.125rem]" strokeWidth={1.75} aria-hidden />
                      </span>
                      {label}
                    </>
                  );
                  return (
                    <li key={href}>
                      {native ? (
                        <NextLink
                          href={href}
                          className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] py-1 pr-2 text-sm font-medium transition-colors"
                        >
                          {row}
                        </NextLink>
                      ) : (
                        <Link
                          href={href}
                          className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] py-1 pr-2 text-sm font-medium transition-colors"
                        >
                          {row}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <p className="text-text-strong mb-4 text-xs font-semibold tracking-wider uppercase">{tFooter("operations")}</p>
              <ul className="flex flex-col gap-1">
                {ops.map(({ href, label, Icon, native }) => {
                  const row = (
                    <>
                      <span className="text-[var(--brand-trust-blue)] flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--brand-trust-blue-soft)]">
                        <Icon className="size-[1.125rem]" strokeWidth={1.75} aria-hidden />
                      </span>
                      {label}
                    </>
                  );
                  return (
                    <li key={href}>
                      {native ? (
                        <NextLink
                          href={href}
                          className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] py-1 pr-2 text-sm font-medium transition-colors"
                        >
                          {row}
                        </NextLink>
                      ) : (
                        <Link
                          href={href}
                          className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] py-1 pr-2 text-sm font-medium transition-colors"
                        >
                          {row}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>
        </div>
      </div>
    </footer>
  );
}
