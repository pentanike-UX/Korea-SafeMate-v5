import NextLink from "next/link";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { FooterPreferences } from "@/components/layout/footer-preferences";
import { BRAND } from "@/lib/constants";
import { Compass, Scale, Users } from "lucide-react";

export async function SiteFooter() {
  const tFooter = await getTranslations("Footer");
  const tBrand = await getTranslations("Brand");
  const tNav = await getTranslations("Nav");
  const tHeader = await getTranslations("Header");

  const service = [
    { href: "/explore" as const, label: tNav("explore") },
    { href: "/posts" as const, label: tNav("posts") },
    { href: "/guardians" as const, label: tNav("guardians") },
    { href: "/mypage" as const, label: tHeader("myJourney") },
    { href: "/about" as const, label: tNav("about") },
  ];

  const guardians: { href: string; label: string }[] = [
    { href: "/guardians", label: tFooter("guardianBrowse") },
    { href: "/guardians/apply", label: tFooter("apply") },
  ];

  const operations: { href: string; label: string; hash?: string; native?: boolean }[] = [
    { href: "/admin/dashboard", label: tFooter("adminConsoleLink"), native: true },
    { href: "/about", label: tFooter("termsLink"), hash: "terms" },
    { href: "/about", label: tFooter("privacyLink"), hash: "privacy" },
  ];

  const linkRow =
    "inline-flex min-h-10 items-center rounded-[var(--radius-md)] py-0.5 pr-1 text-sm font-medium text-white/78 transition-colors hover:text-white";

  return (
    <footer className="border-t border-white/10 bg-[#131a2a] text-white dark:bg-[#05070d]">
      <div className="w-full px-4 py-10 sm:px-6 sm:py-12 md:px-8 md:py-14 xl:px-10">
        <div className="flex flex-col gap-10 border-b border-white/12 pb-10 lg:flex-row lg:items-start lg:gap-10 xl:gap-12">
          <div className="max-w-xl lg:max-w-[min(100%,26rem)] lg:shrink-0">
            <p className="text-base font-semibold tracking-tight text-white">{BRAND.name}</p>
            <p className="mt-2 text-sm leading-relaxed text-white/80 sm:text-[15px]">{tBrand("tagline")}</p>
            <p className="mt-5 text-xs leading-relaxed text-white/58 sm:text-sm">{tFooter("disclaimerShort")}</p>
          </div>

          <nav className="grid flex-1 grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-3 lg:gap-x-5" aria-label="Footer">
            <div>
              <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold tracking-wider text-white/55 uppercase">
                <Compass className="size-3.5 shrink-0 text-white/45" strokeWidth={1.75} aria-hidden />
                {tFooter("product")}
              </p>
              <ul className="flex flex-col gap-0.5">
                {service.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} className={linkRow}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold tracking-wider text-white/55 uppercase">
                <Users className="size-3.5 shrink-0 text-white/45" strokeWidth={1.75} aria-hidden />
                {tFooter("guardians")}
              </p>
              <ul className="flex flex-col gap-0.5">
                {guardians.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} className={linkRow}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold tracking-wider text-white/55 uppercase">
                <Scale className="size-3.5 shrink-0 text-white/45" strokeWidth={1.75} aria-hidden />
                {tFooter("operations")}
              </p>
              <ul className="flex flex-col gap-0.5">
                {operations.map((item) => (
                  <li key={item.native ? item.href : `${item.href}#${item.hash ?? ""}`}>
                    {item.native ? (
                      <NextLink href={item.href} className={linkRow}>
                        {item.label}
                      </NextLink>
                    ) : (
                      <Link href={`${item.href}#${item.hash}`} className={linkRow}>
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-6 sm:mt-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-x-8">
            <FooterPreferences />
            <NextLink
              href="/admin/dashboard"
              className="inline-flex min-h-10 w-fit items-center rounded-[var(--radius-md)] text-xs font-medium text-white/60 underline-offset-4 transition-colors hover:text-white/85 hover:underline sm:shrink-0 sm:text-sm"
            >
              {tFooter("adminConsoleLink")}
            </NextLink>
          </div>
          <p className="border-t border-white/10 pt-5 text-center text-xs leading-relaxed text-white/50 sm:pt-6 sm:text-right sm:text-sm">
            {tFooter("copyright", { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  );
}
